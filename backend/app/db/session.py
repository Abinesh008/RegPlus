from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.app.core.config import settings

# For SQLite databases, allow multithreading access
connect_args = (
    {"check_same_thread": False}
    if settings.DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

class Base(DeclarativeBase):
    """SQLAlchemy declarative base class for SQLAlchemy 2.0 style."""
    pass

def get_db():
    """Dependency to retrieve a new database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
