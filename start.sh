#!/bin/bash
# ProjectTen 一键启动脚本（前后端）
#
# 用法:
#   ./start.sh           启动所有服务
#   ./start.sh backend   仅启动后端
#   ./start.sh frontend  仅启动前端
#   ./start.sh stop     停止所有服务
#   ./start.sh status   查看服务状态

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PID_DIR="$SCRIPT_DIR/pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

start_backend() {
    echo "[Backend] 启动后端服务 (port 8000)..."
    cd "$SCRIPT_DIR/backend"
    source venv/bin/activate
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"
    echo "[Backend] PID: $(cat $PID_DIR/backend.pid)"
}

start_frontend() {
    echo "[Frontend] 启动前端服务 (port 3000)..."
    cd "$SCRIPT_DIR/frontend"
    nohup pnpm dev > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"
    echo "[Frontend] PID: $(cat $PID_DIR/frontend.pid)"
}

stop_all() {
    echo "[Stop] 停止所有服务..."
    for pidfile in "$PID_DIR"/*.pid; do
        [ -f "$pidfile" ] || continue
        pid=$(cat "$pidfile")
        name=$(basename "$pidfile" .pid)
        if kill "$pid" 2>/dev/null; then
            echo "[$name] 已停止 (PID: $pid)"
        else
            echo "[$name] 进程不存在或已停止 (PID: $pid)"
        fi
        rm -f "$pidfile"
    done
}

status() {
    echo "=== 服务状态 ==="
    for port in 8000 3000; do
        if lsof -i :$port &>/dev/null; then
            info=$(lsof -i :$port 2>/dev/null | tail -1)
            echo "✅ port $port: $info"
        else
            echo "❌ port $port: 未运行"
        fi
    done
}

case "${1:-all}" in
    backend)   start_backend ;;
    frontend)  start_frontend ;;
    stop)      stop_all ;;
    status)    status ;;
    all)
        start_backend
        start_frontend
        wait_for_services() {
            echo "等待服务启动..."
            sleep 5
            if lsof -i :8000 -i :3000 &>/dev/null; then
                echo "✅ 所有服务已就绪!"
                echo "  后端: http://localhost:8000"
                echo "  前端: http://localhost:3000"
            else
                echo "⚠️ 部分服务可能未启动，请检查日志"
            fi
        }
        wait_for_services
        ;;
    *)
        echo "用法: $0 {all|backend|frontend|stop|status}"
        exit 1
        ;;
esac
