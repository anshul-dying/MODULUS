"""
Application configuration
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # API settings
    api_title: str = "AutoTrain Advanced API"
    api_version: str = "1.0.0"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Data settings
    data_dir: str = "data"
    uploads_dir: str = "data/uploads"
    artifacts_dir: str = "data/artifacts"
    exports_dir: str = "data/exports"
    processed_dir: str = "data/processed"
    
    # ML settings
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    supported_file_types: list = [".csv"]
    
    # CORS settings
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # AI/LLM settings
    gemini_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra environment variables

# Global settings instance
settings = Settings()

def get_settings() -> Settings:
    """Get the global settings instance"""
    return settings

# Create directories if they don't exist
os.makedirs(settings.uploads_dir, exist_ok=True)
os.makedirs(settings.artifacts_dir, exist_ok=True)
os.makedirs(settings.exports_dir, exist_ok=True)
os.makedirs(settings.processed_dir, exist_ok=True)
