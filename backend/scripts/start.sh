#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

VENV_DIR="${VENV_DIR:-$BACKEND_DIR/venv}"
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-5000}
RELOAD=${RELOAD:-0}
AUTO_INIT_DEMO_DATA=${AUTO_INIT_DEMO_DATA:-1}

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

cd "$BACKEND_DIR"

if [[ "$AUTO_INIT_DEMO_DATA" == "1" ]]; then
  echo "[backend] syncing demo database state"
  python scripts/init_demo_data.py
fi

if [[ "$RELOAD" == "1" ]]; then
  exec uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
else
  exec uvicorn app.main:app --host "$HOST" --port "$PORT"
fi
