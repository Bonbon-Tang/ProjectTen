# ProjectTen

ProjectTen 是一个轻量的评测平台（FastAPI 后端 + React 前端），用于创建评测任务、管理评测记录与查看结果。

- 后端：提供评测 / 资产 / 报告等 API，默认监听 `5000`
- 前端：默认以**构建后的静态站点**运行，监听 `3000`
- 前端到后端：通过 `3000 -> /api/v1 -> 5000` 代理访问
- 评测路由：项目内已逐步统一为单一 JSON 协议（详见本文档与 `PROJECT_NOTES.md`）

## Requirements

- **Python**: 3.10+ (recommended 3.12)
  - Ubuntu/Debian users: you must have `python3-venv` available for `python -m venv`.
- **Node.js**: 18+ (recommended 20+)
- (Optional) **Docker**: 24+ if you prefer container deployment

## Quick Start

We provide **two** deployment paths:

### Path A — One-click local deployment (recommended for internal dev machines)

From repo root:

```bash
# 0) clone
git clone git@github.com:Bonbon-Tang/ProjectTen.git
cd ProjectTen

# 1) (Ubuntu/Debian) ensure base dependencies exist
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip nodejs npm

# 2) install backend + frontend dependencies
bash scripts/install_all.sh

# 3) start backend + frontend（统一启动命令）
bash scripts/start_all.sh
```

Then open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

默认链路：
- 浏览器访问 `http://localhost:3000`
- 前端页面里的 `/api/v1/*` 请求会由 3000 代理到 5000

Logs are written to `./logs/`.

### Internal dev machine pull/update flow

If the code is already cloned on the internal machine:

```bash
cd ProjectTen
git pull origin master
bash scripts/install_all.sh
bash scripts/start_all.sh
```

统一启动命令就是：

```bash
bash scripts/start_all.sh
```

统一停止命令：

```bash
bash scripts/stop_all.sh
```

### Useful process management commands

Stop background services started by `scripts/start_all.sh`:

```bash
bash scripts/stop_all.sh
```

如果怀疑有旧进程占住端口，也可以手动检查：

```bash
lsof -iTCP:3000 -sTCP:LISTEN
lsof -iTCP:5000 -sTCP:LISTEN
```

View logs:

```bash
tail -f logs/backend.log
tail -f logs/frontend.log
```

### Path B — Docker Compose (recommended for "one-click migration")

```bash
docker compose -f deploy/docker/docker-compose.yml up --build -d
```

Open:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

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

说明：
- `frontend/scripts/start.sh` 默认不是 Vite dev server，而是：先 build，再启动静态服务。
- 如果确实要用开发模式，可临时执行：

```bash
cd frontend
FRONTEND_MODE=dev bash scripts/start.sh
```

## Notes

- 本仓库不提交本地运行产物（venv、__pycache__、node_modules、dist、本地 sqlite db 等）。
- 历史零散文档已归并到：
  - `PROJECT_NOTES.md`（按性质分类的统一入口，建议只维护这一份）
  - `docs/legacy/`（原始历史文档存档，可按需删除）
- 端口可通过环境变量覆盖：
  - backend: `HOST`, `PORT`（默认 5000）, `RELOAD`
  - frontend: `HOST`, `PORT`, `FRONTEND_MODE`（默认 `static`，可切 `dev`）
- 生产构建前端 API 基线：`frontend/.env.production` 中 `VITE_API_BASE_URL=/api/v1`
- 如果页面报“网络异常”，优先检查：
  1. `logs/backend.log` 是否有 Python 启动异常
  2. `logs/frontend.log` 是否 build 成功并监听 `3000`
  3. `3000` 与 `5000` 是否都被正确进程监听
