#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

VENV_DIR=${VENV_DIR:-venv}
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8000}
RELOAD=${RELOAD:-1}

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

if [[ "$RELOAD" == "1" ]]; then
  exec uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
else
  exec uvicorn app.main:app --host "$HOST" --port "$PORT"
fi
