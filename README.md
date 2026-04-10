# ProjectTen

ProjectTen 是一个轻量的评测平台（FastAPI 后端 + Vite/React 前端），用于创建评测任务、管理评测记录与查看结果。

- 后端：提供评测/资产/报告等 API
- 前端：提供创建评测、列表/详情、报告浏览等页面
- 评测路由：项目内已逐步统一为单一 JSON 协议（详见本文档与 `PROJECT_NOTES.md`）

## Requirements

- **Python**: 3.10+ (recommended 3.12)
  - Ubuntu/Debian users: you must have `python3-venv` available for `python -m venv`.
- **Node.js**: 18+ (recommended 20+)
- (Optional) **Docker**: 24+ if you prefer container deployment

## Quick Start

We provide **two** deployment paths:

### Path A — Local install (recommended for development)

From repo root:

```bash
# 0) (Ubuntu/Debian) ensure venv support exists
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip

# 1) install deps
bash scripts/install_all.sh

# 2) start platform
bash scripts/start_all.sh
```

Then open:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

Logs are written to `./logs/`.

### Path B — Docker Compose (recommended for "one-click migration")

```bash
docker compose -f deploy/docker/docker-compose.yml up --build -d
```

Open:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

Stop:
```bash
docker compose -f deploy/docker/docker-compose.yml down
```

## Docker (optional)

Docker 相关文件统一放在：`deploy/docker/`

启动：
```bash
docker compose -f deploy/docker/docker-compose.yml up --build -d
```

停止：
```bash
docker compose -f deploy/docker/docker-compose.yml down
```

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

- 本仓库不提交本地运行产物（venv、__pycache__、node_modules、dist、本地 sqlite db 等）。
- 历史零散文档已归并到：
  - `PROJECT_NOTES.md`（按性质分类的统一入口，建议只维护这一份）
  - `docs/legacy/`（原始历史文档存档，可按需删除）
- 端口可通过环境变量覆盖：
  - backend: `HOST`, `PORT`, `RELOAD`
  - frontend: `HOST`, `PORT`
