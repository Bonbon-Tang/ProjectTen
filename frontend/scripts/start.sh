#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

HOST=${HOST:-0.0.0.0}
PORT=${PORT:-3000}
FRONTEND_MODE=${FRONTEND_MODE:-static}

if [[ "$FRONTEND_MODE" == "dev" ]]; then
  exec npm run dev -- --host "$HOST" --port "$PORT"
fi

npm run build
exec node scripts/serve-static.mjs
