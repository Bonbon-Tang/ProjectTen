#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

if [[ -f "$LOG_DIR/backend.pid" ]]; then
  old_pid=$(cat "$LOG_DIR/backend.pid" 2>/dev/null || true)
  if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "[all] backend already running with pid=$old_pid"
  fi
fi

echo "[all] starting backend on :5000"
nohup env PORT=5000 bash "$ROOT_DIR/backend/scripts/start.sh" >"$LOG_DIR/backend.log" 2>&1 &
echo $! >"$LOG_DIR/backend.pid"

if [[ -f "$LOG_DIR/frontend.pid" ]]; then
  old_pid=$(cat "$LOG_DIR/frontend.pid" 2>/dev/null || true)
  if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "[all] frontend already running with pid=$old_pid"
  fi
fi

echo "[all] starting frontend on :3000"
nohup bash "$ROOT_DIR/frontend/scripts/start.sh" >"$LOG_DIR/frontend.log" 2>&1 &
echo $! >"$LOG_DIR/frontend.pid"

echo "[all] started"
echo "  frontend: http://localhost:3000"
echo "  backend : http://localhost:5000"
echo "  logs   : $LOG_DIR"
