# ProjectTen

ProjectTen is a lightweight evaluation platform (backend + frontend).

## Requirements

- **Python**: 3.10+ (recommended 3.12)
- **Node.js**: 18+ (recommended 20+)

## Quick Start (one-command install + one-command start)

From repo root:

```bash
# 1) install deps
bash scripts/install_all.sh

# 2) start platform
bash scripts/start_all.sh
```

Then open:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

Logs are written to `./logs/`.

## Per-service

### Backend

```bash
bash backend/scripts/install.sh
bash backend/scripts/start.sh
```

### Frontend

```bash
bash frontend/scripts/install.sh
bash frontend/scripts/start.sh
```

## Notes

- This repo does **not** commit local runtime artifacts (venv, __pycache__, node_modules, dist, local sqlite db).
- Ports can be overridden via env vars:
  - backend: `HOST`, `PORT`, `RELOAD`
  - frontend: `HOST`, `PORT`
