#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings
from app.db_url import sqlite_path_from_url


EVALUATION_TASKS_COLUMNS = {
    "tags": "tags JSON",
    "primary_tag": "primary_tag VARCHAR(128)",
}

ROLES_COLUMNS = {
    "is_system": "is_system BOOLEAN DEFAULT 0",
    "tenant_id": "tenant_id INTEGER",
    "permissions": "permissions JSON",
    "created_at": "created_at DATETIME",
}


def _cols(cur: sqlite3.Cursor, table: str) -> set[str]:
    cur.execute(f"PRAGMA table_info({table})")
    return {r[1] for r in cur.fetchall()}


def _ensure_columns(cur: sqlite3.Cursor, table: str, defs: dict[str, str]) -> list[str]:
    existing = _cols(cur, table)
    applied = []
    for name, ddl in defs.items():
        if name not in existing:
            sql = f"ALTER TABLE {table} ADD COLUMN {ddl}"
            cur.execute(sql)
            applied.append(sql)
    return applied


def main() -> int:
    if not settings.DATABASE_URL.startswith("sqlite"):
        print("Only sqlite migration is supported by this helper.")
        return 1

    db_path = sqlite_path_from_url(settings.DATABASE_URL)
    if db_path is None:
        print("In-memory sqlite does not need file migration.")
        return 0
    print(f"[migrate] DATABASE_URL={settings.DATABASE_URL}")
    print(f"[migrate] DB_PATH={db_path}")

    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(db_path))
    cur = con.cursor()

    applied = []
    applied += _ensure_columns(cur, "evaluation_tasks", EVALUATION_TASKS_COLUMNS)
    applied += _ensure_columns(cur, "roles", ROLES_COLUMNS)

    con.commit()
    con.close()

    if applied:
        print("[migrate] applied:")
        for sql in applied:
            print(f"  - {sql}")
    else:
        print("[migrate] no schema changes needed")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
