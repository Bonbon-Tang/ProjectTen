#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

start_all() {
  bash "$ROOT_DIR/scripts/start_all.sh"
}

start_backend() {
  PORT=8001 bash "$ROOT_DIR/backend/scripts/start.sh"
}

start_frontend() {
  PORT=3000 API_TARGET="http://127.0.0.1:8001" bash "$ROOT_DIR/frontend/scripts/start.sh"
}

stop_all() {
  if [[ -f "$ROOT_DIR/logs/frontend.pid" ]]; then
    kill "$(cat "$ROOT_DIR/logs/frontend.pid")" 2>/dev/null || true
    rm -f "$ROOT_DIR/logs/frontend.pid"
  fi
  if [[ -f "$ROOT_DIR/logs/backend.pid" ]]; then
    kill "$(cat "$ROOT_DIR/logs/backend.pid")" 2>/dev/null || true
    rm -f "$ROOT_DIR/logs/backend.pid"
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:3000 -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null || true
    lsof -ti tcp:8001 -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null || true
  fi
}

status() {
  echo "=== ProjectTen status ==="
  for port in 3000 8001; do
    if command -v lsof >/dev/null 2>&1 && lsof -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
      lsof -iTCP:$port -sTCP:LISTEN | tail -1
    else
      echo "port $port: not listening"
    fi
  done
}

case "${1:-all}" in
  all)
    start_all
    ;;
  backend)
    start_backend
    ;;
  frontend)
    start_frontend
    ;;
  stop)
    stop_all
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {all|backend|frontend|stop|status}"
    exit 1
    ;;
esac
