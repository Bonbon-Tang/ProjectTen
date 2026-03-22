# 服务器状态恢复报告

## 时间
2026-03-21 10:40

## 问题描述
用户反馈：打开网站显示"服务器内部错误"，所有 HTML 网站都无法访问。

## 问题原因
**后端 API 服务未运行**

检查发现：
- ✅ 前端 Vite 服务：正常运行（端口 3000）
- ❌ 后端 FastAPI 服务：未运行（端口 8000）

## 修复操作

### 重启后端服务
```bash
cd /root/.openclaw/workspace/ProjectTen/backend
source venv/bin/activate
nohup python run.py > backend.log 2>&1 &
```

### 验证状态
```bash
# 检查进程
ps aux | grep "python run.py"

# 查看日志
tail -15 backend.log

# 测试 API
curl http://localhost:8000/api/v1/
```

## 当前状态

### 前端服务
- ✅ 状态：运行中
- ✅ 端口：3000
- ✅ 进程：node vite (PID 858702)
- ✅ 访问：http://43.134.49.154:3000

### 后端服务
- ✅ 状态：运行中
- ✅ 端口：8000
- ✅ 进程：python run.py (PID 860089)
- ✅ 访问：http://43.134.49.154:8000

### API 验证
```json
GET /api/v1/evaluations/
响应：{"detail": "Not authenticated"}
```
✅ API 正常（需要认证是预期行为）

## 服务启动日志
```
INFO:     Will watch for changes in these directories: ['/root/.openclaw/workspace/ProjectTen/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [860089] using WatchFiles
INFO:     Started server process [860091]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## 访问地址

| 服务 | 地址 | 状态 |
|------|------|------|
| 前端 | http://43.134.49.154:3000 | ✅ 正常 |
| 后端 API | http://43.134.49.154:8000 | ✅ 正常 |
| API 文档 | http://43.134.49.154:8000/docs | ✅ 正常 |

## 功能验证

### 资产列表
- URL: http://43.134.49.154:3000/assets/list
- 功能：✅ 正常
- 筛选：✅ 正常
- 分页：✅ 正常

### 模型部署榜单
- URL: http://43.134.49.154:3000/benchmark/models
- 功能：✅ 正常

### 创建任务
- URL: http://43.134.49.154:3000/evaluations/create
- 功能：✅ 正常

## 后续建议

1. **服务监控**: 添加服务健康检查
2. **自动重启**: 配置 systemd 服务自动重启
3. **日志轮转**: 配置日志文件轮转
4. **端口防火墙**: 确保 3000 和 8000 端口开放

---

**修复人员**: AI Assistant  
**修复时间**: 2026-03-21 10:40  
**状态**: ✅ 服务已恢复
