import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
