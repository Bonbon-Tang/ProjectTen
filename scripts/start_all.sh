#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

echo "[all] starting backend on :8000"
nohup bash "$ROOT_DIR/backend/scripts/start.sh" >"$LOG_DIR/backend.log" 2>&1 &
echo $! >"$LOG_DIR/backend.pid"

echo "[all] starting frontend on :3000"
nohup bash "$ROOT_DIR/frontend/scripts/start.sh" >"$LOG_DIR/frontend.log" 2>&1 &
echo $! >"$LOG_DIR/frontend.pid"

echo "[all] started"
echo "  frontend: http://localhost:3000"
echo "  backend : http://localhost:8000"
echo "  logs   : $LOG_DIR"
