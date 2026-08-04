import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.db.session import get_db
from backend.app.models.models import User, Role, AuditLog
from backend.app.core.security import hash_password, validate_password_policy
from backend.app.core.dependencies import get_current_user, RoleChecker
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger("regpulse.users")

# Restrict user management endpoints strictly to Super Admin
admin_guard = RoleChecker(["Super Admin"])

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    department: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

def log_audit(db: Session, email: str, action: str, request: Request):
    try:
        ip_addr = request.client.host if request.client else "unknown"
        log = AuditLog(
            action=action,
            user_email=email,
            ip_address=ip_addr
        )
        db.add(log)
        db.commit()
    except Exception as err:
        logger.error("Audit logging failed: %s", err)

@router.get("")
def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    current_user: User = Depends(admin_guard),
    db: Session = Depends(get_db)
):
    stmt = select(User)
    users = db.execute(stmt).scalars().all()
    
    response_data = []
    for u in users:
        # Check filters
        if search and search.lower() not in u.name.lower() and search.lower() not in u.email.lower():
            continue
        if role and role.lower() != u.role_rel.name.lower():
            continue
            
        response_data.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role_rel.name,
            "department": u.department,
            "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat()
        })
    return response_data

@router.post("")
def create_user(
    payload: UserCreate,
    request: Request,
    current_user: User = Depends(admin_guard),
    db: Session = Depends(get_db)
):
    # Check if email is already registered
    stmt_check = select(User).where(User.email == payload.email)
    existing = db.execute(stmt_check).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        
    # Check password policy
    if not validate_password_policy(payload.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 12 characters and contain uppercase, lowercase, numbers, and special characters."
        )
        
    # Look up Role ID
    stmt_role = select(Role).where(Role.name == payload.role)
    role_record = db.execute(stmt_role).scalar_one_or_none()
    if not role_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role '{payload.role}' does not exist.")
        
    # Create user
    new_user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role_id=role_record.id,
        department=payload.department,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_audit(db, current_user.email, f"USER_CREATION: {payload.email}", request)
    return {"detail": "User created successfully", "user_id": new_user.id}

@router.put("/{id}")
def update_user(
    id: int,
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(admin_guard),
    db: Session = Depends(get_db)
):
    stmt = select(User).where(User.id == id)
    user_record = db.execute(stmt).scalar_one_or_none()
    if not user_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if payload.name is not None:
        user_record.name = payload.name
        
    if payload.department is not None:
        user_record.department = payload.department
        
    if payload.is_active is not None:
        # Prevent self-deactivation of the logged in admin
        if user_record.id == current_user.id and not payload.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own admin account.")
        user_record.is_active = payload.is_active
        
    if payload.role is not None:
        stmt_role = select(Role).where(Role.name == payload.role)
        role_record = db.execute(stmt_role).scalar_one_or_none()
        if not role_record:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role '{payload.role}' does not exist.")
        # Prevent self-demotion
        if user_record.id == current_user.id and payload.role != "Super Admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot demote your own admin account.")
        user_record.role_id = role_record.id
        
    db.commit()
    log_audit(db, current_user.email, f"USER_UPDATE: {user_record.email}", request)
    return {"detail": "User updated successfully"}

@router.delete("/{id}")
def delete_user(
    id: int,
    request: Request,
    current_user: User = Depends(admin_guard),
    db: Session = Depends(get_db)
):
    stmt = select(User).where(User.id == id)
    user_record = db.execute(stmt).scalar_one_or_none()
    if not user_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if user_record.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own admin account.")
        
    email_for_audit = user_record.email
    db.delete(user_record)
    db.commit()
    
    log_audit(db, current_user.email, f"USER_DELETION: {email_for_audit}", request)
    return {"detail": "User deleted successfully"}
