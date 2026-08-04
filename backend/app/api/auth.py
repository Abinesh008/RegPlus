import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from backend.app.db.session import get_db
from backend.app.models.models import User, AuditLog, Session as UserSession
from backend.app.core.security import (
    verify_password,
    hash_password,
    validate_password_policy,
    create_access_token,
    create_refresh_token,
    decode_refresh_token
)
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger("regpulse.auth")

class LoginRequest(BaseModel):
    email: str
    password: str

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

def log_audit(db: Session, email: str, action: str, request: Request):
    try:
        # Resolve client IP address
        ip_addr = request.client.host if request.client else "unknown"
        log = AuditLog(
            action=action,
            user_email=email,
            ip_address=ip_addr
        )
        db.add(log)
        db.commit()
    except Exception as err:
        logger.error("Audit logging failed for %s: %s", email, err)

@router.post("/login")
def login(payload: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    logger.info("Login attempt for email: %s", payload.email)
    stmt = select(User).where(User.email == payload.email)
    user = db.execute(stmt).scalar_one_or_none()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        log_audit(db, payload.email, "FAILED_LOGIN", request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )
        
    # Generate tokens
    access_token = create_access_token({"sub": user.email, "role": user.role_rel.name})
    refresh_token = create_refresh_token({"sub": user.email})
    
    # Store refresh session in database
    expires_at = datetime.utcnow() + timedelta(days=7)
    session_record = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=expires_at
    )
    db.add(session_record)
    
    # Update user last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    log_audit(db, user.email, "LOGIN", request)
    
    # Issue HTTP-Only Cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # Set false for local HTTP dev
        samesite="lax",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role_rel.name,
            "department": user.department,
            "last_login": user.last_login.isoformat() if user.last_login else None
        }
    }

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        # Delete session from DB
        stmt = select(UserSession).where(UserSession.refresh_token == refresh_token)
        session_record = db.execute(stmt).scalar_one_or_none()
        if session_record:
            # Resolve user for audit
            user_email = session_record.user.email
            db.delete(session_record)
            db.commit()
            log_audit(db, user_email, "LOGOUT", request)
            
    response.delete_cookie("refresh_token", path="/")
    return {"detail": "Logged out successfully"}

@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
        
    payload = decode_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        
    stmt = select(UserSession).where(UserSession.refresh_token == refresh_token)
    session_record = db.execute(stmt).scalar_one_or_none()
    if not session_record or session_record.expires_at < datetime.utcnow():
        if session_record:
            db.delete(session_record)
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired session")
        
    user = session_record.user
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")
        
    # Rotate tokens
    new_access_token = create_access_token({"sub": user.email, "role": user.role_rel.name})
    new_refresh_token = create_refresh_token({"sub": user.email})
    
    # Update DB Session
    session_record.refresh_token = new_refresh_token
    session_record.expires_at = datetime.utcnow() + timedelta(days=7)
    db.commit()
    
    # Update Cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role_rel.name,
            "department": user.department,
            "last_login": user.last_login.isoformat() if user.last_login else None
        }
    }

@router.post("/change-password")
def change_password(payload: PasswordChangeRequest, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
        
    if not validate_password_policy(payload.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 12 characters and contain uppercase, lowercase, numbers, and special characters."
        )
        
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    log_audit(db, current_user.email, "PASSWORD_CHANGE", request)
    return {"detail": "Password updated successfully"}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    # Simulate a reset trigger (audit log it and return fake instruction link for validation)
    stmt = select(User).where(User.email == payload.email)
    user = db.execute(stmt).scalar_one_or_none()
    if user:
        log_audit(db, user.email, "FORGOT_PASSWORD_REQUEST", request)
        return {"detail": f"Password reset instructions sent to {payload.email}."}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not registered.")

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role_rel.name,
        "department": current_user.department,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }
