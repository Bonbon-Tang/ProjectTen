#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if command -v npm >/dev/null 2>&1; then
  if [[ -f package-lock.json ]]; then
    echo "[frontend] npm ci"
    npm ci
  else
    echo "[frontend] npm install"
    npm install
  fi
else
  echo "[frontend] ERROR: npm not found"
  exit 1
fi

echo "[frontend] install done"
