# ProjectTen

ProjectTen 是一个轻量评测平台（FastAPI 后端 + React 前端），用于创建评测任务、管理评测记录与查看结果。

当前统一端口约定：
- 后端 API：`8001`
- 前端静态站点：`3000`
- 前端 API 访问链路：`3000 -> /api/v1 -> 8001`

## Requirements

- Python 3.10+（建议 3.12）
- Node.js 18+
- 可选：Docker / Docker Compose

## 一键式部署

### 方案 A：脚本直启（推荐，部署机最稳）

适用于内网机器、Docker Hub 不稳定、需要先恢复可用性的场景。

首次安装依赖：

```bash
git clone git@github.com:Bonbon-Tang/ProjectTen.git
cd ProjectTen
bash scripts/install_all.sh
```

启动前后端：

```bash
bash scripts/start_all.sh
```

或：

```bash
./start.sh
```

访问：
- Frontend: http://localhost:3000
- Backend health: http://localhost:8001/health

停止服务：

```bash
./start.sh stop
```

查看状态：

```bash
./start.sh status
```

查看日志：

```bash
tail -f logs/backend.log
tail -f logs/frontend.log
```

### 方案 B：Docker Compose

Docker 部署文件位于 `deploy/docker/`。

启动：

```bash
docker-compose -f deploy/docker/docker-compose.yml up -d --build
```

停止：

```bash
docker-compose -f deploy/docker/docker-compose.yml down
```

访问：
- Frontend: http://localhost:3000
- Backend health: http://localhost:8001/health

注意：
- `deploy/docker/docker-compose.yml` 的构建上下文已固定为项目根目录。
- 如果部署机无法访问 `docker.io`，Docker 构建会失败；这种场景优先使用“方案 A：脚本直启”。

## 单服务启动

### Backend

```bash
bash backend/scripts/start.sh
```

默认监听 `8001`。

### Frontend

```bash
bash frontend/scripts/start.sh
```

默认行为：先 build，再启动静态服务，并通过 `/api/*` 代理到本机 `8001`。

如果确实要跑 Vite 开发模式：

```bash
cd frontend
FRONTEND_MODE=dev bash scripts/start.sh
```

## 更新流程

开发机：

```bash
git pull
git push origin master
```

部署机：

```bash
cd ProjectTen
git fetch origin
git reset --hard origin/master
bash scripts/start_all.sh
```

## 排障

如果页面报 `API proxy error: socket hang up`，优先检查：

```bash
curl -i http://127.0.0.1:8001/health
curl -i http://127.0.0.1:3000/api/v1/health
```

预期：
- `8001/health` 返回 `200`
- `3000/api/v1/health` 也应返回 `200`

如果 `8001` 正常但 `3000/api` 返回 `502`，说明前端代理层没有使用最新代码或前端进程未重启。
