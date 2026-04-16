#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

VENV_DIR="${VENV_DIR:-$BACKEND_DIR/venv}"
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-5000}
RELOAD=${RELOAD:-0}
AUTO_INIT_DEMO_DATA=${AUTO_INIT_DEMO_DATA:-1}

cd "$BACKEND_DIR"

if [[ -x "$VENV_DIR/bin/python" ]]; then
  PYTHON_BIN="$VENV_DIR/bin/python"
  UVICORN_BIN="$VENV_DIR/bin/uvicorn"
else
  PYTHON_BIN="$(command -v python3 || command -v python)"
  UVICORN_BIN="$(command -v uvicorn || true)"
fi

if [[ -z "${PYTHON_BIN:-}" ]]; then
  echo "[backend] ERROR: python interpreter not found" >&2
  exit 1
fi

if [[ "$AUTO_INIT_DEMO_DATA" == "1" ]]; then
  echo "[backend] syncing demo database state"
  "$PYTHON_BIN" scripts/init_demo_data.py
fi

if [[ -z "${UVICORN_BIN:-}" ]]; then
  echo "[backend] ERROR: uvicorn not found (venv missing?)" >&2
  exit 1
fi

if [[ "$RELOAD" == "1" ]]; then
  exec "$UVICORN_BIN" app.main:app --host "$HOST" --port "$PORT" --reload
else
  exec "$UVICORN_BIN" app.main:app --host "$HOST" --port "$PORT"
fi
