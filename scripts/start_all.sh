#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

if [[ -f "$LOG_DIR/backend.pid" ]]; then
  old_pid=$(cat "$LOG_DIR/backend.pid" 2>/dev/null || true)
  if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "[all] stopping stale backend pid=$old_pid before restart"
    kill "$old_pid" 2>/dev/null || true
    sleep 1
  fi
fi

if command -v lsof >/dev/null 2>&1; then
  port_5000_pid=$(lsof -ti tcp:5000 -sTCP:LISTEN 2>/dev/null | head -n 1 || true)
  if [[ -n "${port_5000_pid:-}" ]]; then
    echo "[all] killing process already listening on :5000 (pid=$port_5000_pid)"
    kill "$port_5000_pid" 2>/dev/null || true
    sleep 1
  fi
fi

echo "[all] starting backend on :5000"
nohup env PORT=5000 bash "$ROOT_DIR/backend/scripts/start.sh" >"$LOG_DIR/backend.log" 2>&1 &
backend_pid=$!
echo $backend_pid >"$LOG_DIR/backend.pid"

backend_ready=""
for _ in {1..60}; do
  if command -v lsof >/dev/null 2>&1; then
    backend_ready=$(lsof -ti tcp:5000 -sTCP:LISTEN 2>/dev/null | head -n 1 || true)
    if [[ -n "${backend_ready:-}" ]]; then
      break
    fi
  fi
  if [[ -f "$LOG_DIR/backend.log" ]] && grep -q "Uvicorn running on http://0.0.0.0:5000" "$LOG_DIR/backend.log" 2>/dev/null; then
    backend_ready=$backend_pid
    break
  fi
  sleep 1
done

if [[ -z "${backend_ready:-}" ]]; then
  echo "[all] ERROR: backend failed to bind :5000, see $LOG_DIR/backend.log"
  tail -n 50 "$LOG_DIR/backend.log"
  exit 1
fi

echo "[all] backend ready (pid=$backend_ready)"

if [[ -f "$LOG_DIR/frontend.pid" ]]; then
  old_pid=$(cat "$LOG_DIR/frontend.pid" 2>/dev/null || true)
  if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "[all] stopping stale frontend pid=$old_pid before restart"
    kill "$old_pid" 2>/dev/null || true
    sleep 1
  fi
fi

if command -v lsof >/dev/null 2>&1; then
  port_3000_pid=$(lsof -ti tcp:3000 -sTCP:LISTEN 2>/dev/null | head -n 1 || true)
  if [[ -n "${port_3000_pid:-}" ]]; then
    echo "[all] killing process already listening on :3000 (pid=$port_3000_pid)"
    kill "$port_3000_pid" 2>/dev/null || true
    sleep 1
  fi
fi

echo "[all] starting frontend on :3000"
nohup env PORT=3000 bash "$ROOT_DIR/frontend/scripts/start.sh" >"$LOG_DIR/frontend.log" 2>&1 &
echo $! >"$LOG_DIR/frontend.pid"

if command -v lsof >/dev/null 2>&1; then
  actual_frontend_pid=""
  for _ in {1..90}; do
    actual_frontend_pid=$(lsof -ti tcp:3000 -sTCP:LISTEN 2>/dev/null | head -n 1 || true)
    if [[ -n "${actual_frontend_pid:-}" ]]; then
      break
    fi
    sleep 1
  done
  if [[ -z "${actual_frontend_pid:-}" ]]; then
    echo "[all] ERROR: frontend failed to bind :3000, see $LOG_DIR/frontend.log"
    exit 1
  fi
fi

echo "[all] started"
echo "  frontend: http://localhost:3000"
echo "  backend : http://localhost:5000"
echo "  logs   : $LOG_DIR"
