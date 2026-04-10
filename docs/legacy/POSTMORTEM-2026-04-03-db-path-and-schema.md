# Postmortem: 数据库路径误连 + Schema 漂移导致前端 500

日期：2026-04-03

## 现象

- 登录后前端显示“服务器内部错误”
- admin 账号下看不到预期历史任务
- 后端接口 `/api/v1/evaluations/` 返回 500

## 根因

这次不是单点故障，而是两个问题叠加：

### 1) 数据库路径配置错误

`backend/.env` 中的 `DATABASE_URL` 指向了错误路径：

```env
/root/.openclaw/workspace/backend/data/app.db
```

实际项目数据库应位于：

```env
/root/.openclaw/workspace/ProjectTen/backend/data/app.db
```

结果：服务最初连到了另一份库，导致：
- 能启动
- 能登录（补种账号后）
- 但看不到 ProjectTen 的真实历史任务数据

### 2) 数据库 Schema 落后于当前代码模型

切换到正确数据库后，后端仍报错：

```text
sqlite3.OperationalError: no such column: evaluation_tasks.tags
```

说明代码中的 SQLAlchemy 模型已经新增字段，但数据库文件没有同步迁移。

本次确认缺失字段包括：
- `evaluation_tasks.tags`
- `evaluation_tasks.primary_tag`
- `roles.is_system`
- `roles.tenant_id`
- `roles.permissions`
- `roles.created_at`

结果：
- 登录成功
- 健康检查正常
- 但列表接口在 ORM 查询阶段直接 500

## 直接教训

1. **“服务能启动”不等于“连接的是正确数据源”**
2. **SQLite 提交入仓后，模型升级必须伴随迁移策略**，否则极易出现“代码比库新”的问题
3. **补默认账号不是根修复**，只能缓解登录问题，不能替代数据源核对
4. **排查顺序必须固定**：
   - 先确认 DB 路径
   - 再确认目标库是否包含预期业务数据
   - 再确认 schema 是否匹配当前代码

## 本次修复动作

### 已完成

1. 修正 `backend/.env` 中的数据库路径
2. 定位机器上两份 `app.db`，确认正确库中存在 admin 历史任务
3. 对正确数据库执行补列迁移，修复 schema 漂移
4. 验证以下接口恢复正常：
   - `/health`
   - `/api/v1/auth/login`
   - `/api/v1/evaluations/`
   - `/api/v1/resources/summary`
   - `/api/v1/users/me`

## 防再犯措施

### A. 启动前强校验数据源

后端启动前至少检查：
- `DATABASE_URL` 是否位于项目目录内（开发环境）
- 关键表是否存在：`users`, `evaluation_tasks`, `evaluation_reports`
- 若检测到非预期路径，启动时明确告警

### B. 增加 schema 版本/迁移机制

不要依赖“代码自动建表 + 旧库沿用”。

建议：
- 正式使用 Alembic
- 每次模型新增字段必须提供 migration
- 启动前检查关键字段是否存在，缺失时拒绝进入服务或自动执行迁移脚本

### C. 发布前做最小冒烟测试

每次发版至少验证：
1. admin 登录
2. `/api/v1/users/me`
3. `/api/v1/evaluations/?page=1&page_size=5`
4. `/api/v1/resources/summary`
5. admin 是否能看到历史任务

### D. 不要把环境路径写死到个人目录之外的相似目录

开发配置应优先使用：
- 相对路径
- 项目内路径解析
- `.env.example` 与真实代码默认值保持一致

避免再出现“同机两个 app.db，服务连错库”的情况。

## 建议后续代码改造

1. 新增启动脚本：`scripts/preflight_check.py`
2. 新增数据库迁移脚本：`scripts/migrate_sqlite_schema.py`
3. 把 SQLite 路径改为相对项目根目录推导，减少硬编码绝对路径
4. 在 README 中加入“如何确认自己连的是正确数据库”

## 一句话总结

**这次事故不是前端问题，而是“连错数据库 + 数据库 schema 比代码旧”叠加导致的。以后先验数据源，再验 schema，最后才看业务逻辑。**
