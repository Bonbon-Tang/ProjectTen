from __future__ import annotations

import subprocess
import sys

import uvicorn


def run_preflight() -> None:
    result = subprocess.run([sys.executable, "scripts/preflight_check.py"], check=False)
    if result.returncode != 0:
        print("\n[run.py] preflight failed. If schema is outdated, run:")
        print(f"  {sys.executable} scripts/migrate_sqlite_schema.py")
        raise SystemExit(result.returncode)


if __name__ == "__main__":
    run_preflight()
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
