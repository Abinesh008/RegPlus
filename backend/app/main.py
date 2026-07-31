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
