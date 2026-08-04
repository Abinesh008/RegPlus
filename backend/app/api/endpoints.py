import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from pathlib import Path

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.models import Circular, Obligation, DiffSession, DiffResult, RuleMapping, User
from backend.app.schemas.schemas import (
    CircularMetadataResponse,
    CircularResponse,
    ObligationResponse,
    DiffRequest,
    DiffSummaryResponse,
    DiffDetailResponse,
    DiffResultResponse,
    MappingSummaryResponse,
    MappingDetailResponse
)
from backend.app.services.pdf_extractor import (
    compute_sha256,
    get_or_extract_text,
    extract_title,
    extract_version_date,
    UPLOADS_DIR,
    SAMPLES_DIR
)

# Authentication and Authorization imports
from backend.app.core.dependencies import get_current_user, RoleChecker
from backend.app.api.auth import router as auth_router
from backend.app.api.users import router as users_router

router = APIRouter()
logger = logging.getLogger("regpulse.api")

# Register Auth and Users sub-routers
router.include_router(auth_router)
router.include_router(users_router)

# Define guards
manager_guard = RoleChecker(["Super Admin", "Compliance Manager"])
analyst_guard = RoleChecker(["Super Admin", "Compliance Manager", "Compliance Analyst"])
auditor_guard = RoleChecker(["Super Admin", "Compliance Manager", "Compliance Analyst", "Auditor"])

@router.get("/health")
def health_check():
    """Health check endpoint to verify backend status and Gemini integration."""
    logger.debug("Health check requested")
    
    api_key = settings.GEMINI_API_KEY
    gemini_configured = False
    
    if not api_key or api_key in ("mock_api_key", "your_gemini_api_key_here"):
        logger.debug("Gemini key is mock or empty. Using Mock Mode.")
    else:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            gemini_configured = True
            logger.debug("Gemini Client initialized successfully. Active mode enabled.")
        except Exception as err:
            logger.warning("Failed to initialize Gemini Client: %s", err)
            gemini_configured = False

    return {
        "status": "OK",
        "gemini_configured": gemini_configured,
        "model_name": settings.MODEL_NAME
    }

@router.get("/circulars", response_model=List[CircularMetadataResponse])
def list_circulars(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
async def upload_circular(
    file: UploadFile = File(...), 
    current_user: User = Depends(manager_guard),
    db: Session = Depends(get_db)
):
    """Uploads a PDF, extracts and cleans its text, and saves it in the database.
    Uses SHA-256 hashing to check cache and deduplicate database records.
    """
    filename = file.filename
    logger.info("Upload started for file: %s", filename)
    
    if not filename.lower().endswith('.pdf'):
        logger.error("Rejecting file %s: only PDF is allowed.", filename)
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    temp_path = UPLOADS_DIR / f"temp_{filename}"
    try:
        file_size = 0
        with temp_path.open("wb") as f:
            while chunk := await file.read(65536):
                file_size += len(chunk)
                if file_size > 50 * 1024 * 1024:
                    logger.error("Rejecting file %s: exceeds 50MB limit.", filename)
                    raise HTTPException(status_code=413, detail="File size exceeds maximum limit of 50 MB.")
                f.write(chunk)
        
        file_hash = compute_sha256(temp_path)
        
        stmt = select(Circular).where(Circular.pdf_hash == file_hash)
        existing_circular = db.execute(stmt).scalar_one_or_none()
        
        if existing_circular:
            logger.info("Circular with hash %s already exists. Reusing database record.", file_hash)
            temp_path.unlink()
            logger.info("Upload completed (reused existing record) for: %s", filename)
            
            return {
                "circular_id": existing_circular.id,
                "title": existing_circular.title,
                "source_filename": existing_circular.source_filename,
                "cached": True
            }
            
        final_pdf_path = UPLOADS_DIR / filename
        if final_pdf_path.exists():
            final_pdf_path.unlink()
        temp_path.rename(final_pdf_path)
        
        cleaned_text, cached_hit = get_or_extract_text(final_pdf_path, file_hash)
        
        title = extract_title(cleaned_text, filename)
        version_date = extract_version_date(cleaned_text)
        
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
def get_circular_metadata(
    id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve metadata for a specific circular by ID."""
    logger.info("Fetching metadata for circular ID: %d", id)
    stmt = select(Circular).where(Circular.id == id)
    circular = db.execute(stmt).scalar_one_or_none()
    if not circular:
        logger.error("Circular with ID %d not found.", id)
        raise HTTPException(status_code=404, detail="Circular not found")
    return circular

@router.get("/circulars/{id}/text")
def get_circular_text(
    id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve clean extracted text for a specific circular by ID."""
    logger.info("Fetching text for circular ID: %d", id)
    stmt = select(Circular).where(Circular.id == id)
    circular = db.execute(stmt).scalar_one_or_none()
    if not circular:
        logger.error("Circular with ID %d not found.", id)
        raise HTTPException(status_code=404, detail="Circular not found")
    return {"id": circular.id, "text": circular.raw_text}

@router.post("/circulars/process-samples")
def process_samples(
    current_user: User = Depends(manager_guard),
    db: Session = Depends(get_db)
):
    """Scans sample_circulars directory and processes all PDFs found.
    Uses hash-based cache and deduplication, saving records to DB.
    """
    logger.info("Sample processing started")
    results = []
    
    if not SAMPLES_DIR.exists():
        logger.warning("Sample circulars directory does not exist: %s", SAMPLES_DIR)
        return {"processed": 0, "details": []}
        
    pdf_files = list(SAMPLES_DIR.glob("*.pdf")) + list(SAMPLES_DIR.glob("*.PDF"))
    pdf_files = list(set(pdf_files))
    
    logger.info("Found %d sample PDF files to process.", len(pdf_files))
    
    for pdf_path in pdf_files:
        filename = pdf_path.name
        try:
            file_hash = compute_sha256(pdf_path)
            
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
                
            cleaned_text, cached_hit = get_or_extract_text(pdf_path, file_hash)
            
            title = extract_title(cleaned_text, filename)
            version_date = extract_version_date(cleaned_text)
            
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
def extract_circular_obligations(
    id: int, 
    current_user: User = Depends(manager_guard),
    db: Session = Depends(get_db)
):
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
def get_circular_obligations(
    id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve stored compliance obligations for a specific circular by ID (never calls Gemini)."""
    logger.info("Fetching obligations for circular ID: %d", id)
    try:
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

@router.post("/diff", response_model=DiffSummaryResponse)
def compute_diff(
    request: DiffRequest, 
    current_user: User = Depends(manager_guard),
    db: Session = Depends(get_db)
):
    """Compare two RBI circulars using their obligations."""
    logger.info("Diff API requested: old_circular_id=%d, new_circular_id=%d", request.old_circular_id, request.new_circular_id)
    try:
        from backend.app.services.diff_engine import diff_circulars
        result = diff_circulars(db, request.old_circular_id, request.new_circular_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in POST /diff: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Diff engine failed: {str(e)}")

@router.get("/diff/{diff_id}", response_model=DiffDetailResponse)
def get_diff_detail(
    diff_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve diff results grouped by category."""
    logger.info("Diff detail requested for session ID: %d", diff_id)
    try:
        stmt_session = select(DiffSession).where(DiffSession.id == diff_id)
        session_record = db.execute(stmt_session).scalar_one_or_none()
        if not session_record:
            logger.error("DiffSession with ID %d not found.", diff_id)
            raise HTTPException(status_code=404, detail="DiffSession not found")
            
        stmt_results = select(DiffResult).where(DiffResult.diff_session_id == diff_id)
        results = db.execute(stmt_results).scalars().all()
        
        grouped = {
            "NEW": [r for r in results if r.category == "new"],
            "CHANGED": [r for r in results if r.category == "changed"],
            "UNCHANGED": [r for r in results if r.category == "unchanged"]
        }
        return grouped
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in GET /diff/{diff_id}: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

@router.post("/diff/{diff_id}/map", response_model=MappingSummaryResponse)
def map_diff_rules(
    diff_id: int, 
    current_user: User = Depends(manager_guard),
    db: Session = Depends(get_db)
):
    """Run rule mapping engine for new and changed obligations in a diff session."""
    logger.info("Rule mapping POST requested for session ID: %d", diff_id)
    try:
        from backend.app.services.rule_mapper import run_mapping_workflow
        summary = run_mapping_workflow(db, diff_id)
        return summary
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in POST /diff/{diff_id}/map: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Rule mapping failed: {str(e)}")

@router.get("/diff/{diff_id}/mappings", response_model=List[MappingDetailResponse])
def get_diff_mappings(
    diff_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve rule mappings for new and changed obligations in a diff session."""
    logger.info("Rule mappings GET requested for session ID: %d", diff_id)
    try:
        import json
        stmt_session = select(DiffSession).where(DiffSession.id == diff_id)
        session_record = db.execute(stmt_session).scalar_one_or_none()
        if not session_record:
            logger.error("DiffSession with ID %d not found.", diff_id)
            raise HTTPException(status_code=404, detail="DiffSession not found")
            
        stmt_results = select(DiffResult).where(
            DiffResult.diff_session_id == diff_id,
            DiffResult.category.in_(["new", "changed"])
        )
        diff_results = db.execute(stmt_results).scalars().all()
        
        response_data = []
        for r in diff_results:
            if not r.new_obligation:
                continue
                
            stmt_mapping = select(RuleMapping).where(RuleMapping.obligation_id == r.new_obligation_id)
            mapping = db.execute(stmt_mapping).scalar_one_or_none()
            
            if mapping:
                try:
                    matched_params = json.loads(mapping.matched_param_ids)
                except Exception:
                    matched_params = [mapping.matched_param_ids]
                    
                try:
                    business_layers = json.loads(mapping.affected_business_layer)
                except Exception:
                    business_layers = []
                    
                response_data.append({
                    "obligation": r.new_obligation.obligation_text,
                    "matched_parameters": matched_params,
                    "confidence": mapping.confidence,
                    "priority": mapping.implementation_priority,
                    "reasoning": mapping.reasoning,
                    "affected_business_layer": business_layers,
                    "mapping_source": mapping.mapping_source,
                    "review_required": mapping.review_required,
                    "match_score": mapping.match_score,
                    "mapping_version": mapping.mapping_version
                })
                
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in GET /diff/{diff_id}/mappings: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

@router.get("/diff/{diff_id}/export/pdf")
def export_diff_pdf(
    diff_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates and exports a professional compliance impact PDF advisory report."""
    logger.info("PDF export requested for diff ID: %d", diff_id)
    try:
        from backend.app.services.pdf_generator import generate_compliance_pdf
        pdf_content = generate_compliance_pdf(db, diff_id)
        
        headers = {
            "Content-Disposition": f"attachment; filename=RegPulse_Compliance_Report_{diff_id}.pdf"
        }
        return Response(content=pdf_content, media_type="application/pdf", headers=headers)
    except ValueError as ve:
        logger.error("Diff session not found: %s", str(ve))
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("Error in GET /diff/{diff_id}/export/pdf: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.get("/diff/{diff_id}/export/csv")
def export_diff_csv(
    diff_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates and exports a compliance impact CSV table."""
    logger.info("CSV export requested for diff ID: %d", diff_id)
    try:
        from backend.app.services.csv_generator import generate_compliance_csv
        csv_content = generate_compliance_csv(db, diff_id)
        
        headers = {
            "Content-Disposition": f"attachment; filename=RegPulse_Rule_Impact_Table_{diff_id}.csv"
        }
        return Response(content=csv_content, media_type="text/csv", headers=headers)
    except Exception as e:
        logger.error("Error in GET /diff/{diff_id}/export/csv: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV: {str(e)}")
