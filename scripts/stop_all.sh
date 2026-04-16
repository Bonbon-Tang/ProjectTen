#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"

stop_by_pid_file() {
  local name="$1"
  local pid_file="$2"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid=$(cat "$pid_file" 2>/dev/null || true)
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "[all] stopping $name pid=$pid"
      kill "$pid" 2>/dev/null || true
    else
      echo "[all] $name pid file exists but process not running"
    fi
    rm -f "$pid_file"
  else
    echo "[all] no pid file for $name"
  fi
}

stop_by_pid_file "backend" "$LOG_DIR/backend.pid"
stop_by_pid_file "frontend" "$LOG_DIR/frontend.pid"

pkill -f 'uvicorn app.main:app --host 0.0.0.0 --port 5000' 2>/dev/null || true
pkill -f 'vite --host 0.0.0.0 --port 3000' 2>/dev/null || true

echo "[all] stopped"
