# ProjectTen Makefile
# 简化部署和开发流程

.PHONY: help install-backend install-frontend install build-backend build-frontend build run-backend run-frontend test deploy clean

help: ## 显示帮助信息
	@echo "ProjectTen Makefile Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""

install-backend: ## 安装后端依赖
	cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt

install-frontend: ## 安装前端依赖
	cd frontend && pnpm install

install: install-backend install-frontend ## 安装所有依赖

init-db: ## 初始化数据库
	cd backend && source venv/bin/activate && alembic upgrade head

seed-data: ## 运行种子数据
	cd backend && source venv/bin/activate && \
	python scripts/seed_model_assets.py && \
	python scripts/seed_all_chip_scenarios.py

build-backend: ## 构建后端（无操作，Python 无需构建）
	@echo "Backend ready (Python)"

build-frontend: ## 构建前端
	cd frontend && pnpm build

build: build-frontend ## 构建所有

run-backend: ## 运行后端（开发模式）
	cd backend && source venv/bin/activate && python run.py

run-backend-prod: ## 运行后端（生产模式）
	cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

run-frontend: ## 运行前端（开发模式）
	cd frontend && pnpm dev

run-frontend-preview: ## 运行前端（生产预览）
	cd frontend && pnpm preview

run: ## 运行所有服务（需要多个终端）
	@echo "Run backend in one terminal: make run-backend"
	@echo "Run frontend in another: make run-frontend"

docker-build: ## 构建 Docker 镜像
	docker-compose build

docker-up: ## 启动 Docker 服务
	docker-compose up -d

docker-down: ## 停止 Docker 服务
	docker-compose down

docker-logs: ## 查看 Docker 日志
	docker-compose logs -f

docker: docker-build docker-up ## 构建并启动 Docker 服务

test-backend: ## 运行后端测试
	cd backend && source venv/bin/activate && pytest

test-frontend: ## 运行前端测试
	cd frontend && pnpm test

test: test-backend test-frontend ## 运行所有测试

deploy: build ## 部署到生产环境
	@echo "Deploying..."
	@echo "1. Ensure backend is running"
	@echo "2. Deploy frontend/dist/ to your web server"

clean: ## 清理构建产物
	rm -rf backend/__pycache__
	rm -rf backend/app/__pycache__
	rm -rf backend/app/api/__pycache__
	rm -rf backend/app/api/v1/__pycache__
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	rm -rf cpu-test-runner/__pycache__
	@echo "Cleaned"

# CPU Test Runner
cpu-test: ## 运行 CPU 测试
	cd cpu-test-runner && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python runner.py --task-id $(TASK_ID)

cpu-test-docker: ## 使用 Docker 运行 CPU 测试
	docker build -f Dockerfile.cpu-test -t projectten-cpu-test .
	docker run --rm -v ./backend/data:/app/backend/data projectten-cpu-test python runner.py --task-id $(TASK_ID)
