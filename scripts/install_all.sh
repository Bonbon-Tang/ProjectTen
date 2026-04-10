#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[all] install backend"
bash "$ROOT_DIR/backend/scripts/install.sh"

echo "[all] install frontend"
bash "$ROOT_DIR/frontend/scripts/install.sh"

echo "[all] install done"
