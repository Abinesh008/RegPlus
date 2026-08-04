from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Define base directory using pathlib
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    """Configuration loader for the RegPulse application."""
    
    GEMINI_API_KEY: str = Field(default="mock_api_key")
    MODEL_NAME: str = Field(default="gemini-2.5-flash")
    DATABASE_URL: str = Field(default="sqlite:///./regpulse.db")
    LOG_LEVEL: str = Field(default="INFO")

    # JWT Credentials & Expirations (mapped to env variables)
    JWT_SECRET_KEY: str = Field(default="supersecretaccesskeyforregpulse")
    JWT_REFRESH_SECRET_KEY: str = Field(default="supersecretrefreshkeyforregpulse")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)

    
    # Configure Pydantic to read from a .env file located at backend/
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
