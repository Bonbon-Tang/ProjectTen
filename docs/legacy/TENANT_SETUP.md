# ProjectTen 租户与用户管理配置

## 📋 功能概述

实现了多租户资源隔离和权限控制，支持企业用户和个人用户两种租户类型，具有资源使用限额和访问权限控制。

## 👥 用户与租户配置

### 企业租户（admin）
- **用户名**: `admin`
- **密码**: `admin123`
- **租户类型**: `enterprise`
- **租户名称**: 企业租户
- **资源配额**:
  - 计算配额：10000
  - 存储配额：1000 GB
  - 最大并发任务：10
- **设备资源**: 23 台华为昇腾 910C + 其他所有设备

### 个人用户（usr1）
- **用户名**: `usr1`
- **密码**: `123`
- **租户类型**: `personal`
- **租户名称**: 个人租户-usr1
- **资源配额**:
  - 计算配额：1000
  - 存储配额：100 GB
  - 最大并发任务：2
- **设备资源**: 1 台华为昇腾 910C

## 🔐 权限控制

### 设备访问
- **admin**: 可以看到所有设备（包括其他租户的设备）
- **个人用户**: 只能看到自己租户的设备

### 评测任务
- **创建**: 所有用户都可以创建评测任务
- **查看**: 
  - admin 可以看到所有任务
  - 个人用户只能看到自己创建的任务
- **删除**: 
  - admin 可以删除任何任务
  - 个人用户只能删除自己创建的任务

### 资产管理
- **删除权限**: 
  - admin 可以删除任何资产
  - 个人用户只能删除自己创建的资产

## 🛠️ 技术实现

### 数据库变更
1. **tenants 表**: 新增租户表，存储租户类型、资源配额等信息
2. **users 表**: 新增 `tenant_id` 字段关联租户
3. **compute_devices 表**: 新增 `tenant_id` 字段标识设备归属

### API 变更
1. **`/api/v1/resources/devices`**: 支持按租户过滤设备列表
2. **`/api/v1/evaluations/`**: 支持按创建者过滤任务列表
3. **`/api/v1/evaluations/{task_id}` (DELETE)**: 增加权限校验
4. **`/api/v1/evaluations/batch-delete`**: 增加权限校验
5. **`/api/v1/assets/{asset_id}` (DELETE)**: 增加权限校验

### 关键代码修改

#### 1. 设备列表过滤 (`app/services/resource_service.py`)
```python
@staticmethod
def list_devices(db: Session, tenant_id: Optional[int] = None) -> List[ComputeDevice]:
    q = db.query(ComputeDevice)
    if tenant_id is not None:
        # 非管理员用户只能看到自己租户的设备和共享设备
        q = q.filter(
            (ComputeDevice.tenant_id == tenant_id) | (ComputeDevice.tenant_id == None)
        )
    return q.order_by(ComputeDevice.id).all()
```

#### 2. 任务删除权限校验 (`app/api/v1/evaluations.py`)
```python
@router.delete("/{task_id}")
def delete_evaluation(task_id: int, ...):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 权限检查：非管理员用户只能删除自己的任务
    if current_user.user_type != "admin" and task.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权限删除此任务：只能删除自己创建的任务")
    
    EvaluationService.delete(db, task)
```

#### 3. Benchmark 去重 (`app/services/evaluation_service.py`)
- 同一芯片 + 模型组合只保留最新一次测试结果
- 避免 Benchmark 榜单中出现重复数据

## 🧪 测试验证

### 设备隔离测试
```bash
# usr1 只能看到自己的 1 台 910C
curl -H "Authorization: Bearer $USR1_TOKEN" http://localhost:8000/api/v1/resources/devices
# 输出：ID=6, name=华为昇腾 910C-个人, total=1

# admin 可以看到所有设备
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8000/api/v1/resources/devices
# 输出：所有 6 条设备记录
```

### 任务权限测试
```bash
# usr1 尝试删除 admin 的任务（失败）
curl -X DELETE http://localhost:8000/api/v1/evaluations/1 \
  -H "Authorization: Bearer $USR1_TOKEN"
# 输出：{"detail": "无权限删除此任务：只能删除自己创建的任务"}

# usr1 删除自己的任务（成功）
curl -X DELETE http://localhost:8000/api/v1/evaluations/12 \
  -H "Authorization: Bearer $USR1_TOKEN"
# 输出：{"code": 0, "message": "Task deleted"}
```

### 资产权限测试
```bash
# usr1 尝试删除 admin 的资产（失败）
curl -X DELETE http://localhost:8000/api/v1/assets/11 \
  -H "Authorization: Bearer $USR1_TOKEN"
# 输出：{"detail": "无权限删除此资产：只能删除自己创建的资产"}
```

## 📝 使用说明

### 登录
- **企业用户**: 使用 `admin` / `admin123` 登录
- **个人用户**: 使用 `usr1` / `123` 登录

### 资源使用
- 个人用户创建评测任务时，只能使用自己租户的设备
- 企业用户可以使用所有设备资源
- admin 可以在管理后台查看所有租户的资源使用情况

### 设备租售逻辑

个人用户通过**租用**方式获得设备使用权：

1. **租用设备**: admin 为个人用户分配设备并设置到期时间
2. **租用期间**: 个人用户可以看到并使用分配的设备
3. **到期后**: 
   - 设备自动回归企业资源池（admin 可用）
   - 个人用户无法再看到和使用该设备
4. **续租**: admin 可以延长设备分配到期时间

#### 设置设备分配（admin）

```bash
# 获取 admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

# 为 usr1 分配 1 台 910C，到期时间为明天
curl -X PUT http://localhost:8000/api/v1/tenants/2/devices \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_allocation": {"huawei_910c": 1},
    "expires_at": "2026-03-24T10:00:00Z"
  }'
```

#### 查看设备分配状态

```bash
# 查看租户的设备分配
curl http://localhost:8000/api/v1/tenants/2/devices \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

响应示例：
```json
{
  "tenant_id": 2,
  "tenant_name": "个人租户-usr1",
  "device_allocation": {"huawei_910c": 1},
  "expires_at": "2026-03-24T02:55:37",
  "is_expired": false
}
```

### 添加新用户
运行后端目录下的初始化脚本：
```bash
cd /root/.openclaw/workspace/ProjectTen/backend
source venv/bin/activate
python3 setup_tenants.py
```

## 🔧 后续优化建议

1. **资源使用统计**: 实现租户级别的资源使用量统计和配额限制
2. **设备共享机制**: 支持设备在租户间的临时借用或共享
3. **任务优先级**: 企业用户的任务优先级高于个人用户
4. **审计日志**: 记录所有跨租户的资源访问操作
