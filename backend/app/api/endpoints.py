import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from pathlib import Path

from backend.app.db.session import get_db
from backend.app.models.models import Circular, Obligation
from backend.app.schemas.schemas import CircularMetadataResponse, CircularResponse, ObligationResponse
from backend.app.services.pdf_extractor import (
    compute_sha256,
    get_or_extract_text,
    extract_title,
    extract_version_date,
    UPLOADS_DIR,
    SAMPLES_DIR
)

router = APIRouter()
logger = logging.getLogger("regpulse.api")

@router.get("/health")
def health_check():
    """Health check endpoint to verify backend status."""
    logger.debug("Health check requested")
    return {"status": "OK"}

@router.get("/circulars", response_model=List[CircularMetadataResponse])
def list_circulars(db: Session = Depends(get_db)):
    """List all uploaded/sample circulars from the database."""
    logger.info("Listing all circulars")
    try:
        stmt = select(Circular).order_by(Circular.created_at.desc())
        circulars = db.execute(stmt).scalars().all()
        return circulars
    except Exception as e:
        logger.error("Error listing circulars: %s", e)
        raise HTTPException(status_code=500, detail="Database query error")

@router.post("/circulars/upload")
async def upload_circular(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Uploads a PDF, extracts and cleans its text, and saves it in the database.
    Uses SHA-256 hashing to check cache and deduplicate database records.
    """
    filename = file.filename
    logger.info("Upload started for file: %s", filename)
    
    # Validate extension
    if not filename.lower().endswith('.pdf'):
        logger.error("Rejecting file %s: only PDF is allowed.", filename)
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    # Save file to a temporary location to compute hash and check size
    temp_path = UPLOADS_DIR / f"temp_{filename}"
    try:
        # Enforce size limit (50 MB)
        file_size = 0
        with temp_path.open("wb") as f:
            while chunk := await file.read(65536):
                file_size += len(chunk)
                if file_size > 50 * 1024 * 1024:
                    logger.error("Rejecting file %s: exceeds 50MB limit.", filename)
                    raise HTTPException(status_code=413, detail="File size exceeds maximum limit of 50 MB.")
                f.write(chunk)
        
        # Compute SHA-256 hash
        file_hash = compute_sha256(temp_path)
        
        # Check database for existing circular with same pdf_hash
        stmt = select(Circular).where(Circular.pdf_hash == file_hash)
        existing_circular = db.execute(stmt).scalar_one_or_none()
        
        if existing_circular:
            logger.info("Circular with hash %s already exists. Reusing database record.", file_hash)
            # Remove temp file
            temp_path.unlink()
            logger.info("Upload completed (reused existing record) for: %s", filename)
            
            return {
                "circular_id": existing_circular.id,
                "title": existing_circular.title,
                "source_filename": existing_circular.source_filename,
                "cached": True
            }
            
        # Rename temp file to final destination
        final_pdf_path = UPLOADS_DIR / filename
        if final_pdf_path.exists():
            final_pdf_path.unlink()
        temp_path.rename(final_pdf_path)
        
        # Extract and clean text (checking cache)
        cleaned_text, cached_hit = get_or_extract_text(final_pdf_path, file_hash)
        
        # Extract title and version date
        title = extract_title(cleaned_text, filename)
        version_date = extract_version_date(cleaned_text)
        
        # Save to database
        db_circular = Circular(
            title=title,
            version_date=version_date,
            source_filename=filename,
            pdf_hash=file_hash,
            raw_text=cleaned_text
        )
        db.add(db_circular)
        db.commit()
        db.refresh(db_circular)
        
        logger.info("Database saved: circular ID %d", db_circular.id)
        logger.info("Upload completed for: %s", filename)
        
        return {
            "circular_id": db_circular.id,
            "title": db_circular.title,
            "source_filename": db_circular.source_filename,
            "cached": cached_hit
        }
        
    except HTTPException:
        if temp_path.exists():
            temp_path.unlink()
        raise
    except ValueError as ve:
        logger.error("PDF processing error: %s", str(ve))
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error("Internal error during upload: %s", str(e))
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/circulars/{id}", response_model=CircularMetadataResponse)
def get_circular_metadata(id: int, db: Session = Depends(get_db)):
    """Retrieve metadata for a specific circular by ID."""
    logger.info("Fetching metadata for circular ID: %d", id)
    stmt = select(Circular).where(Circular.id == id)
    circular = db.execute(stmt).scalar_one_or_none()
    if not circular:
        logger.error("Circular with ID %d not found.", id)
        raise HTTPException(status_code=404, detail="Circular not found")
    return circular

@router.get("/circulars/{id}/text")
def get_circular_text(id: int, db: Session = Depends(get_db)):
    """Retrieve clean extracted text for a specific circular by ID."""
    logger.info("Fetching text for circular ID: %d", id)
    stmt = select(Circular).where(Circular.id == id)
    circular = db.execute(stmt).scalar_one_or_none()
    if not circular:
        logger.error("Circular with ID %d not found.", id)
        raise HTTPException(status_code=404, detail="Circular not found")
    return {"id": circular.id, "text": circular.raw_text}

@router.post("/circulars/process-samples")
def process_samples(db: Session = Depends(get_db)):
    """Scans sample_circulars directory and processes all PDFs found.
    Uses hash-based cache and deduplication, saving records to DB.
    """
    logger.info("Sample processing started")
    results = []
    
    if not SAMPLES_DIR.exists():
        logger.warning("Sample circulars directory does not exist: %s", SAMPLES_DIR)
        return {"processed": 0, "details": []}
        
    # Scan for PDF files
    pdf_files = list(SAMPLES_DIR.glob("*.pdf")) + list(SAMPLES_DIR.glob("*.PDF"))
    # Eliminate duplicate paths in case case-insensitive match on Windows
    pdf_files = list(set(pdf_files))
    
    logger.info("Found %d sample PDF files to process.", len(pdf_files))
    
    for pdf_path in pdf_files:
        filename = pdf_path.name
        try:
            # Compute SHA-256 hash
            file_hash = compute_sha256(pdf_path)
            
            # Check database for existing circular with same pdf_hash
            stmt = select(Circular).where(Circular.pdf_hash == file_hash)
            existing_circular = db.execute(stmt).scalar_one_or_none()
            
            if existing_circular:
                logger.info("Sample %s (hash: %s) already in DB. Reusing record.", filename, file_hash)
                results.append({
                    "filename": filename,
                    "status": "reused",
                    "circular_id": existing_circular.id,
                    "title": existing_circular.title,
                    "cached": True
                })
                continue
                
            # Extract and clean text (checking cache)
            cleaned_text, cached_hit = get_or_extract_text(pdf_path, file_hash)
            
            # Extract title and version date
            title = extract_title(cleaned_text, filename)
            version_date = extract_version_date(cleaned_text)
            
            # Save to database
            db_circular = Circular(
                title=title,
                version_date=version_date,
                source_filename=filename,
                pdf_hash=file_hash,
                raw_text=cleaned_text
            )
            db.add(db_circular)
            db.commit()
            db.refresh(db_circular)
            
            logger.info("Database saved: circular ID %d", db_circular.id)
            results.append({
                "filename": filename,
                "status": "processed",
                "circular_id": db_circular.id,
                "title": db_circular.title,
                "cached": cached_hit
            })
            
        except Exception as e:
            logger.error("Error processing sample circular %s: %s", filename, str(e))
            results.append({
                "filename": filename,
                "status": "failed",
                "error": str(e)
            })
            
    logger.info("Sample processing completed")
    return {"processed": len(pdf_files), "details": results}

@router.post("/circulars/{id}/extract", response_model=List[ObligationResponse])
def extract_circular_obligations(id: int, db: Session = Depends(get_db)):
    """Extract compliance obligations from a circular (utilizes Gemini/Mock Mode)."""
    logger.info("Extraction requested for circular ID: %d", id)
    try:
        stmt = select(Circular).where(Circular.id == id)
        circular = db.execute(stmt).scalar_one_or_none()
        if not circular:
            logger.error("Circular with ID %d not found for extraction.", id)
            raise HTTPException(status_code=404, detail="Circular not found")
        
        from backend.app.services.obligation_extractor import run_extraction_workflow
        obligations = run_extraction_workflow(circular, db)
        return obligations
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error during obligation extraction: %s", e)
        raise HTTPException(status_code=500, detail=f"Internal extraction error: {str(e)}")

@router.get("/circulars/{id}/obligations", response_model=List[ObligationResponse])
def get_circular_obligations(id: int, db: Session = Depends(get_db)):
    """Retrieve stored compliance obligations for a specific circular by ID (never calls Gemini)."""
    logger.info("Fetching obligations for circular ID: %d", id)
    try:
        # Check if circular exists first to return 404 if missing
        stmt_circ = select(Circular).where(Circular.id == id)
        circular = db.execute(stmt_circ).scalar_one_or_none()
        if not circular:
            logger.error("Circular with ID %d not found.", id)
            raise HTTPException(status_code=404, detail="Circular not found")
            
        stmt = select(Obligation).where(Obligation.circular_id == id)
        obligations = db.execute(stmt).scalars().all()
        return obligations
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error retrieving obligations: %s", e)
        raise HTTPException(status_code=500, detail="Database query error")
