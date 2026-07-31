import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.logging import setup_logging
from backend.app.db.session import engine, Base
from backend.app.api.endpoints import router as api_router

# Initialize standard logging
setup_logging(settings.LOG_LEVEL)
logger = logging.getLogger("regpulse.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for DB auto-initialization."""
    logger.info("Initializing database tables on startup...")
    try:
        from sqlalchemy import inspect
        from pathlib import Path
        
        # Check if schema is outdated and recreate if necessary
        db_url = settings.DATABASE_URL
        if db_url.startswith("sqlite:///"):
            db_path_str = db_url.replace("sqlite:///", "")
            db_file = Path(db_path_str)
            
            inspector = inspect(engine)
            recreate_needed = False
            
            if "circulars" in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns("circulars")]
                if "pdf_hash" not in columns:
                    recreate_needed = True
            
            if "obligations" in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns("obligations")]
                if "confidence_score" not in columns:
                    recreate_needed = True
            
            if "diff_results" in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns("diff_results")]
                if "semantic_verified" not in columns or "diff_session_id" not in columns or "match_reason" not in columns:
                    recreate_needed = True
            
            if "rule_mappings" in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns("rule_mappings")]
                if "implementation_priority" not in columns or "mapping_source" not in columns or "review_required" not in columns or "match_score" not in columns or "mapping_version" not in columns:
                    recreate_needed = True
                    
            if recreate_needed:
                logger.warning("Outdated database schema detected (missing column). Recreating database...")
                try:
                    Base.metadata.drop_all(bind=engine)
                    logger.info("Outdated database tables dropped successfully.")
                except Exception as drop_err:
                    logger.error("Failed to drop tables: %s. Deleting database file.", drop_err)
                    engine.dispose()
                    if db_file.exists():
                        try:
                            db_file.unlink()
                            logger.info("Outdated database file deleted successfully.")
                        except Exception as unlink_err:
                            logger.error("Failed to delete database file: %s", unlink_err)
                                
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error("Failed to initialize database tables: %s", e)
    yield

app = FastAPI(
    title="RegPulse API",
    description="Reserve Bank of India Circular Impact Simulator API",
    version="1.0.0",
    lifespan=lifespan
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error("HTTP exception occurred: %s (status=%d)", exc.detail, exc.status_code)
    suggestion = "Verify your request payload or configuration parameters."
    
    exc_detail_lower = str(exc.detail).lower()
    if "api key" in exc_detail_lower or "credentials" in exc_detail_lower:
        suggestion = "Make sure your GEMINI_API_KEY environment variable is set correctly in your backend/.env file."
    elif "timeout" in exc_detail_lower or "limit" in exc_detail_lower or "quota" in exc_detail_lower or "exhausted" in exc_detail_lower:
        suggestion = "The Gemini API request timed out or exceeded quota limits. Please retry in a few moments."
    elif "database" in exc_detail_lower or "db" in exc_detail_lower or "locked" in exc_detail_lower:
        suggestion = "The database appears to be locked or busy. Please retry the request."

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "suggestion": suggestion
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Global unhandled exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred while processing the request on the server.",
            "suggestion": "Check the backend server logs for full stacktrace. Verify database connection and API keys."
        }
    )

# Configure CORS for React frontend (localhost:5173)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoints
app.include_router(api_router)

logger.info("RegPulse app configuration completed.")
