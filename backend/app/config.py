from __future__ import annotations

import json
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings

from app.db_url import normalize_database_url, sqlite_path_from_url

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = Path("data") / "app.db"


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"

    # JWT
    SECRET_KEY: str = "change-me-to-a-long-random-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:5173"]'

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            return ["*"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
settings.DATABASE_URL = normalize_database_url(settings.DATABASE_URL, base_dir=BASE_DIR)

# Ensure data directory exists for SQLite
sqlite_path = sqlite_path_from_url(settings.DATABASE_URL)
if sqlite_path is not None:
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
