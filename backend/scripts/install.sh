#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PYTHON_BIN=${PYTHON_BIN:-python3}
VENV_DIR=${VENV_DIR:-venv}

echo "[backend] create venv: $VENV_DIR"
if ! $PYTHON_BIN -m venv "$VENV_DIR"; then
  echo "[backend] ERROR: failed to create venv. On Ubuntu/Debian you likely need: sudo apt-get install -y python3-venv"
  exit 1
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

python -m pip install --upgrade pip

if [[ -f requirements.txt ]]; then
  echo "[backend] install requirements.txt"
  pip install -r requirements.txt
else
  echo "[backend] ERROR: requirements.txt not found"
  exit 1
fi

if [[ -f alembic.ini ]]; then
  echo "[backend] run migrations"
  alembic upgrade head || true
fi

echo "[backend] install done"
