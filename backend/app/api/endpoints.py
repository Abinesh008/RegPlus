import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.db.session import get_db
from backend.app.models.models import Circular
from backend.app.schemas.schemas import CircularResponse

router = APIRouter()
logger = logging.getLogger("regpulse.api")

@router.get("/health")
def health_check():
    """Health check endpoint to verify backend status."""
    logger.debug("Health check requested")
    return {"status": "OK"}

@router.get("/circulars", response_model=List[CircularResponse])
def list_circulars(db: Session = Depends(get_db)):
    """List all uploaded circulars from the database."""
    logger.info("Listing all circulars")
    try:
        stmt = select(Circular).order_by(Circular.created_at.desc())
        circulars = db.execute(stmt).scalars().all()
        return circulars
    except Exception as e:
        logger.error("Error listing circulars: %s", e)
        raise HTTPException(status_code=500, detail="Database query error")

@router.post("/circulars/upload")
async def upload_circular(file: UploadFile = File(...)):
    """Stub endpoint for uploading regulatory circulars. To be fully implemented in Prompt 2."""
    logger.info("Upload stub called for file: %s", file.filename)
    return "Not Implemented Yet"
