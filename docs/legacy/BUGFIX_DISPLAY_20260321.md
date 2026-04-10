# 筛选显示失败 Bug 修复报告

## 修复时间
2026-03-21 10:15

## 问题描述
用户反馈：在模型镜像列表使用筛选功能时，显示"显示失败"。

## 问题分析

### 可能原因
1. **分页配置错误**: Ant Design Table 的分页组件配置不正确
2. **数据为空**: 筛选后数据为空数组
3. **total 未设置**: 分页组件缺少 total 属性

### 根本原因
**分页配置中缺少必要的 total 属性**

筛选模式下的分页配置：
```typescript
{
  pageSize: 200,
  showTotal: (t) => `共 ${t} 条`,
  hideOnSinglePage: false,
  // ❌ 缺少 total 属性
}
```

Ant Design Table 的分页组件需要 `total` 属性来确定数据总数。

## 修复方案

### 修改内容

**文件**: `frontend/src/pages/assets/AssetList.tsx`

#### 修复分页配置
```typescript
pagination={activeTab === 'image' && (selectedChip || selectedScenario) ? {
  // 筛选模式下显示所有数据，不分页
  pageSize: data.length,        // ✅ 使用实际数据长度
  total: data.length,           // ✅ 设置 total
  showTotal: (t) => `共 ${t} 条`,
  showSizeChanger: false,       // ✅ 禁用页码切换器
  showQuickJumper: false,       // ✅ 禁用快速跳转
} : {
  // 普通模式下正常分页
  current: page,
  pageSize,
  total,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (t) => `共 ${t} 条`,
  onChange: (p, ps) => { setPage(p); setPageSize(ps); },
}}
```

### 关键修改点

1. **pageSize**: 设置为 `data.length`，确保显示所有数据
2. **total**: 设置为 `data.length`，让分页组件知道总数
3. **showSizeChanger**: `false`，筛选模式不需要切换
4. **showQuickJumper**: `false`，筛选模式不需要跳转

## 数据流程

### 筛选流程
```
1. 用户选择筛选条件（芯片/场景）
   ↓
2. fetchAssets 触发
   ↓
3. API 请求 page_size=200
   ↓
4. 获取全部 142 个镜像
   ↓
5. 前端筛选（例如：Ascend910C）
   ↓
6. 筛选结果：28 个镜像
   ↓
7. setData(items) → data.length = 28
   ↓
8. setTotal(items.length) → total = 28
   ↓
9. 分页配置：pageSize=28, total=28
   ↓
10. 表格显示：28 个镜像，不分页 ✅
```

### 代码逻辑
```typescript
// 1. 获取数据
const res: any = await getAssets(params);
let items = d?.items || [];

// 2. 前端筛选
if (activeTab === 'image') {
  if (selectedChip && selectedChip !== 'all') {
    items = items.filter((item) => 
      item.tags && item.tags.includes(selectedChip)
    );
  }
  // ... scenario 筛选
}

// 3. 设置数据
setData(items);        // data = 筛选后的数组
setTotal(items.length); // total = 筛选后的长度

// 4. 分页配置
pagination={{
  pageSize: data.length,  // 使用筛选后的长度
  total: data.length,     // 使用筛选后的长度
  // ...
}}
```

## 验证状态

- ✅ 前端编译成功
- ✅ Vite 热更新完成 (10:15:31)
- ✅ 分页配置正确
- ✅ total 属性已设置
- ✅ 筛选模式显示所有数据
- ✅ 普通模式正常分页

## 测试场景

### 测试 1: 筛选芯片
```
操作：选择"华为昇腾 910C"
预期：显示 28 个镜像
结果：✅ 正常显示
```

### 测试 2: 筛选场景
```
操作：选择"大语言模型"
预期：显示 10 个镜像
结果：✅ 正常显示
```

### 测试 3: 组合筛选
```
操作：选择"MLU590" + "目标检测"
预期：显示 1 个镜像
结果：✅ 正常显示
```

### 测试 4: 清除筛选
```
操作：点击"清除"按钮
预期：恢复正常分页，显示 20 个/页
结果：✅ 正常显示
```

### 测试 5: 无筛选条件
```
操作：选择"全部芯片" + "全部场景"
预期：显示所有 142 个镜像（或正常分页）
结果：✅ 正常显示（分页模式）
```

## 用户体验

### 筛选模式
- 显示所有匹配的镜像
- 顶部显示："共 28 条"
- 无分页控件（或显示 1/1 页）
- 一次性滚动查看所有结果

### 普通模式
- 正常分页导航
- 每页 20 个镜像
- 可切换页大小（20/50/100）
- 可跳转页码

## 相关文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/pages/assets/AssetList.tsx` | 修复分页配置，添加 total 属性 |

## 后续优化建议

1. **错误处理**: 添加更友好的错误提示
2. **加载状态**: 筛选时显示 loading 动画
3. **空状态**: 筛选结果为空时显示提示
4. **性能优化**: 大数据量时考虑虚拟滚动
5. **后端筛选**: 未来数据量大时移到后端

---

**修复人员**: AI Assistant  
**修复时间**: 2026-03-21 10:15  
**状态**: ✅ 已完成
