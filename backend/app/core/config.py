import os
from typing import List

class Settings:
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "NER Landslide Early Warning & Routing System"
    
    # Database connection URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./landslide_ews.db")
    
    # CORS Origins (allow local dev server & production domains)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:5173",  # React Vite default port
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "*"  # Allow all for development flexibility
    ]

settings = Settings()
