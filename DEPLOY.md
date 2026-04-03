# ProjectTen 部署指南

本文档说明如何在其他服务器上部署 ProjectTen。

## 目录结构

```
/
├── backend/              # FastAPI 后端
│   ├── app/             # 应用代码
│   ├── alembic/         # 数据库迁移
│   ├── scripts/         # 数据种子脚本
│   ├── data/            # 数据目录（CPU test 报告等）
│   ├── requirements.txt # Python 依赖
│   └── run.py           # 启动脚本
├── frontend/            # Vite + React 前端
│   ├── src/            # 源代码
│   ├── package.json    # Node 依赖
│   └── vite.config.ts  # Vite 配置
├── docker-compose.yml   # Docker Compose 配置
├── Dockerfile.backend   # 后端 Docker 镜像
├── Dockerfile.frontend  # 前端 Docker 镜像
└── DEPLOY.md           # 本部署文档
```

## 方式一：Docker Compose 部署（推荐）

### 前置条件

- Docker 20.10+
- Docker Compose 2.0+

### 步骤

1. **克隆仓库**
```bash
git clone https://github.com/Bonbon-Tang/ProjectTen.git
cd ProjectTen
```

2. **配置环境变量**
```bash
# 创建后端环境变量文件
cp backend/.env.example backend/.env
# 编辑 backend/.env 配置数据库、密钥等
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **查看日志**
```bash
docker-compose logs -f
```

5. **访问应用**
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 方式二：手动部署

### 前置条件

- Python 3.12+
- Node.js 18+
- pnpm 8+

### 后端部署

1. **创建虚拟环境**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

2. **安装依赖**
```bash
pip install -r requirements.txt
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件
```

4. **初始化数据库**
```bash
alembic upgrade head
python scripts/preflight_check.py
# 如果旧 SQLite 库缺少新字段，再执行：
python scripts/migrate_sqlite_schema.py
# 如果需要默认账号和本地演示租户：
python scripts/init_demo_data.py
```

5. **运行种子数据（可选）**
```bash
python scripts/seed_model_assets.py
python scripts/seed_all_chip_scenarios.py
```

6. **启动后端**
```bash
# 开发模式（包含 preflight）
python run.py

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 前端部署

1. **安装依赖**
```bash
cd frontend
pnpm install
```

2. **配置环境变量**
```bash
cp .env.development .env.production
# 编辑 .env.production 配置后端 API 地址
```

3. **构建**
```bash
pnpm build
```

4. **预览（可选）**
```bash
pnpm preview
```

5. **部署到生产服务器**
- 将 `dist/` 目录内容部署到 Nginx 或其他 Web 服务器
- 或运行 `pnpm preview --host 0.0.0.0 --port 4173`

## CPU Test Runner 部署

CPU Test Runner 用于执行 CPU 相关的评估任务。

### 部署步骤

1. **创建 cpu-test-runner 目录**
```bash
mkdir -p cpu-test-runner
cd cpu-test-runner
```

2. **创建虚拟环境**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. **安装依赖**
```bash
pip install fastapi uvicorn requests python-dotenv
```

4. **运行 CPU Test**
```bash
# 后端会自动在以下目录生成报告
# backend/data/cpu_test_reports/
```

### CPU Test 报告位置

- JSON 报告：`backend/data/cpu_test_reports/task_{id}_cpu_test_report.json`
- 文本报告：`backend/data/cpu_test_reports/task_{id}_cpu_test_report.txt`

## 环境变量配置

### 后端 (.env)

```bash
# 数据库
DATABASE_URL=sqlite:///data/app.db

# JWT 配置
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 服务器
HOST=0.0.0.0
PORT=8000

# 日志
LOG_LEVEL=info
```

### 前端 (.env.production)

```bash
VITE_API_BASE_URL=http://your-server:8000
```

## 生产环境建议

1. **使用 PostgreSQL 代替 SQLite**
```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/projectten
```

2. **配置 Nginx 反向代理**

3. **使用 HTTPS**

4. **配置防火墙**
```bash
# 只开放必要端口
ufw allow 80
ufw allow 443
ufw allow 22
```

5. **设置自动备份**
```bash
# 定期备份 backend/data/ 目录
```

## 故障排查

### 后端无法启动

```bash
# 检查端口占用
lsof -i :8000

# 检查依赖
pip install -r requirements.txt --upgrade

# 查看日志
tail -f backend/backend.log
```

### 前端构建失败

```bash
# 清理 node_modules
rm -rf node_modules
pnpm install

# 检查 Node 版本
node --version  # 需要 18+
```

### 数据库迁移失败

```bash
# 重置迁移
alembic downgrade base
alembic upgrade head
```

## 更新部署

```bash
# 拉取最新代码
git pull origin master

# 后端更新
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
# 重启服务

# 前端更新
cd frontend
pnpm install
pnpm build
# 重新部署 dist/
```
