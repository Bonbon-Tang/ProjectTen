# ProjectTen 设备租售管理

## 📋 功能概述

实现了设备租用逻辑，支持企业将设备分配给个人用户/租户使用，并设置到期时间。到期后设备自动回归企业资源池。

## 🎯 核心逻辑

### 租用流程
1. **admin 分配设备** → 设置设备类型、数量、到期时间
2. **租户使用期间** → 租户可以看到并使用分配的设备
3. **到期自动回收** → 设备回归企业资源池，租户无法再使用
4. **续租** → admin 可以延长到期时间

### 资源池管理
- **企业资源池**: admin 管理所有设备（如 24 台 910C）
- **已分配**: 分配给租户的设备从企业可用数量中扣除
- **到期回收**: 租户到期后，设备自动回归企业资源池

## 🔧 API 使用

### 1. 设置设备分配

**请求**:
```http
PUT /api/v1/tenants/{tenant_id}/devices
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "device_allocation": {
    "huawei_910c": 1,
    "cambrian_590": 2
  },
  "expires_at": "2026-03-24T10:00:00Z"
}
```

**参数说明**:
- `device_allocation`: 设备类型和数量的映射
  - `huawei_910c`: 1 → 1 台华为昇腾 910C
  - `cambrian_590`: 2 → 2 台寒武纪 MLU590
- `expires_at`: ISO 8601 格式的到期时间（UTC）

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tenant_id": 2,
    "tenant_name": "个人租户-usr1",
    "device_allocation": {"huawei_910c": 1},
    "expires_at": "2026-03-24T02:55:37"
  }
}
```

### 2. 查看设备分配状态

**请求**:
```http
GET /api/v1/tenants/{tenant_id}/devices
Authorization: Bearer {admin_token}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tenant_id": 2,
    "tenant_name": "个人租户-usr1",
    "device_allocation": {"huawei_910c": 1},
    "expires_at": "2026-03-24T02:55:37",
    "is_expired": false
  }
}
```

### 3. 租户查看可用设备

**请求**:
```http
GET /api/v1/resources/devices
Authorization: Bearer {tenant_token}
```

**响应**（未过期）:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "华为昇腾 910C",
      "device_type": "huawei_910c",
      "total_count": 1,
      "available_count": 1
    }
  ]
}
```

**响应**（已过期）:
```json
{
  "code": 0,
  "message": "success",
  "data": []
}
```

## 📊 实际案例

### 案例 1: usr1 租用 1 台 910C（24 小时）

**初始状态**:
- admin: 24 台 910C 可用
- usr1: 无设备

**admin 执行分配**:
```bash
ADMIN_TOKEN="..."
curl -X PUT http://localhost:8000/api/v1/tenants/2/devices \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_allocation": {"huawei_910c": 1},
    "expires_at": "2026-03-24T10:00:00Z"
  }'
```

**租用期间**:
- admin: 23 台 910C 可用（24 - 1）
- usr1: 1 台 910C 可用

**到期后**:
- admin: 24 台 910C 可用（自动回收）
- usr1: 0 台 910C 可用

### 案例 2: 续租

usr1 的租用即将到期，admin 决定续租 7 天：

```bash
# 计算 7 天后的时间
EXPIRES_AT=$(date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%SZ")

curl -X PUT http://localhost:8000/api/v1/tenants/2/devices \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"device_allocation\": {\"huawei_910c\": 1},
    \"expires_at\": \"$EXPIRES_AT\"
  }"
```

### 案例 3: 调整设备数量

usr1 需要更多算力，admin 增加 1 台 910C：

```bash
curl -X PUT http://localhost:8000/api/v1/tenants/2/devices \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_allocation": {"huawei_910c": 2},
    "expires_at": "2026-03-24T10:00:00Z"
  }'
```

**调整后**:
- admin: 22 台 910C 可用（24 - 2）
- usr1: 2 台 910C 可用

## 🔐 权限控制

- **admin**: 可以分配、修改、回收任何租户的设备
- **租户**: 只能查看和使用自己分配到的设备，无法修改分配

## 🗄️ 数据库设计

### tenants 表新增字段

```sql
-- 设备分配（JSON 格式）
device_allocation JSON DEFAULT NULL
-- 示例：{"huawei_910c": 1, "cambrian_590": 2}

-- 设备分配到期时间
device_allocation_expires_at DATETIME DEFAULT NULL
```

### 自动过期逻辑

在 `ResourceService.list_devices_for_tenant()` 中实现：

```python
# 检查是否过期
if tenant.device_allocation_expires_at:
    now = datetime.now(timezone.utc)
    expires_at = tenant.device_allocation_expires_at
    if now > expires_at:
        # 已过期，返回空列表
        return []
```

## 📈 监控与审计

所有设备分配操作都会记录审计日志：

- `update_device_allocation`: 设备分配变更
- 记录内容：租户 ID、设备类型、数量、到期时间、操作人

## 🛠️ 运维建议

### 1. 定期检查即将到期的分配

```bash
# 查询 7 天内到期的租户
SELECT id, name, device_allocation, device_allocation_expires_at 
FROM tenants 
WHERE device_allocation_expires_at IS NOT NULL 
  AND device_allocation_expires_at <= datetime('now', '+7 days');
```

### 2. 清理过期分配（可选）

虽然过期后租户无法使用设备，但可以定期清理过期数据：

```sql
UPDATE tenants 
SET device_allocation = NULL, device_allocation_expires_at = NULL
WHERE device_allocation_expires_at < datetime('now');
```

### 3. 通知租户

建议在设备到期前通过邮件/短信通知租户续租。

## 🚀 未来扩展

1. **自动续租**: 支持设置自动续租策略
2. **计费集成**: 根据租用时长和设备类型计费
3. **预约系统**: 支持预约未来时间段的设备
4. **优先级队列**: 企业用户设备使用优先级高于个人用户
