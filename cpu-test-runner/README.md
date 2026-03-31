# CPU Test Runner

CPU 性能测试执行器，用于执行 CPU 相关的评估任务。

## 安装

```bash
# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# 或 .venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

## 使用

### 基本用法

```bash
# 运行指定任务的 CPU 测试
python runner.py --task-id 1

# 指定后端 API 地址
python runner.py --task-id 1 --api-url http://your-server:8000

# 指定要测试的算子
python runner.py --task-id 1 --operators op1 op2 op3
```

### 参数说明

- `--task-id`: 任务 ID（必填）
- `--api-url`: 后端 API 地址（可选，默认 http://localhost:8000）
- `--operators`: 要测试的算子列表（可选，不指定则从 API 获取）

## 输出

测试报告会保存在 `backend/data/cpu_test_reports/` 目录：

- `task_{id}_cpu_test_report.json` - JSON 格式报告
- `task_{id}_cpu_test_report.txt` - 文本格式报告

## Docker 运行

```bash
# 构建镜像
docker build -f Dockerfile.cpu-test -t projectten-cpu-test .

# 运行
docker run --rm \
  -v ./backend/data:/app/backend/data \
  projectten-cpu-test \
  python runner.py --task-id 1 --api-url http://host.docker.internal:8000
```
