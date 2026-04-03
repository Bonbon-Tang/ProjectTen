#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings, BASE_DIR
from app.db_url import sqlite_path_from_url

REQUIRED_TABLES = [
    "users",
    "evaluation_tasks",
    "evaluation_reports",
    "roles",
    "tenants",
]

REQUIRED_COLUMNS = {
    "evaluation_tasks": ["tags", "primary_tag"],
    "roles": ["is_system", "tenant_id", "permissions", "created_at"],
}


def main() -> int:
    db_path = sqlite_path_from_url(settings.DATABASE_URL)
    print(f"[preflight] DATABASE_URL={settings.DATABASE_URL}")

    if db_path is None:
        print("[preflight] non-sqlite database detected, skip sqlite-specific checks")
        return 0

    print(f"[preflight] DB_PATH={db_path}")

    try:
        resolved = db_path.resolve()
    except FileNotFoundError:
        resolved = db_path

    if not str(resolved).startswith(str(BASE_DIR.resolve())):
        print("[preflight][warn] database is outside backend base dir; verify this is intentional")

    if not db_path.exists():
        print("[preflight][warn] database file does not exist yet; app may create a new empty db")
        return 0

    con = sqlite3.connect(str(db_path))
    cur = con.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {r[0] for r in cur.fetchall()}

    missing_tables = [t for t in REQUIRED_TABLES if t not in tables]
    if missing_tables:
        print(f"[preflight][error] missing tables: {', '.join(missing_tables)}")
        con.close()
        return 2

    missing_columns: list[str] = []
    for table, required_cols in REQUIRED_COLUMNS.items():
        cur.execute(f"PRAGMA table_info({table})")
        cols = {r[1] for r in cur.fetchall()}
        for col in required_cols:
            if col not in cols:
                missing_columns.append(f"{table}.{col}")

    # helpful data hints
    try:
        admin_count = cur.execute("SELECT COUNT(*) FROM users WHERE username='admin'").fetchone()[0]
        task_count = cur.execute("SELECT COUNT(*) FROM evaluation_tasks").fetchone()[0]
        print(f"[preflight] admin_users={admin_count}, evaluation_tasks={task_count}")
    except Exception:
        pass

    con.close()

    if missing_columns:
        print("[preflight][error] missing columns: " + ", ".join(missing_columns))
        print("[preflight][hint] run: python scripts/migrate_sqlite_schema.py")
        return 3

    print("[preflight] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
