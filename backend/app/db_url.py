from __future__ import annotations

from pathlib import Path


def normalize_database_url(database_url: str, *, base_dir: Path) -> str:
    """Normalize database URLs for local ProjectTen usage.

    Rules:
    - For SQLite relative paths, resolve against backend base dir.
    - Accept sqlite+aiosqlite URLs in config, but normalize to sync sqlite URL
      because current app uses SQLAlchemy sync engine/session.
    - Leave non-sqlite URLs unchanged.
    """
    if not database_url.startswith("sqlite"):
        return database_url

    normalized = database_url.replace("sqlite+aiosqlite:///", "sqlite:///")

    if normalized == "sqlite:///:memory:":
        return normalized

    prefix = "sqlite:///"
    if not normalized.startswith(prefix):
        return normalized

    raw_path = normalized[len(prefix):]
    path = Path(raw_path)

    if not path.is_absolute():
        path = (base_dir / path).resolve()

    return f"sqlite:///{path}"


def sqlite_path_from_url(database_url: str) -> Path | None:
    if not database_url.startswith("sqlite"):
        return None
    normalized = database_url.replace("sqlite+aiosqlite:///", "sqlite:///")
    if normalized == "sqlite:///:memory:":
        return None
    raw = normalized.replace("sqlite:///", "", 1)
    return Path(raw)
