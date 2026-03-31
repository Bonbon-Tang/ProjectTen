# 资产类型修复报告

## 修复时间
2026-03-21 09:58

## 问题描述
在资产列表页面 (http://43.134.49.154:3000/assets/list)，用户发现点击"模型镜像"Tab 后无法看到任何镜像资产。

## 问题原因

### 前后端资产类型不匹配

**前端配置** (`frontend/src/utils/constants.ts`):
```typescript
export const ASSET_TYPES = [
  { label: '模型镜像', value: 'model', key: 'model' },  // ❌ 错误：使用'model'
  // ...
];
```

**后端数据库** (`backend/app/models/asset.py`):
```python
class AssetType(str, enum.Enum):
    model = "model"      # 保留但未使用
    image = "image"      # ✅ 实际使用的镜像类型
    # ...
```

**数据库实际情况**:
```
asset_type 分布:
  image: 34 个      ← 所有镜像资产使用这个
  operator: 5 个
  toolset: 30 个
```

### 问题影响
- 前端 Tab 过滤参数：`asset_type=model`
- 后端查询条件：`WHERE asset_type = 'model'`
- 结果：返回 0 条记录（因为数据库中是`asset_type='image'`）

## 修复方案

### 修改文件
`frontend/src/utils/constants.ts`

### 修改内容
```diff
export const ASSET_TYPES = [
-  { label: '模型镜像', value: 'model', key: 'model' },
+  { label: '模型镜像', value: 'image', key: 'image' },
  { label: '数据集', value: 'dataset', key: 'dataset' },
  { label: '算子库', value: 'operator', key: 'operator' },
  { label: '脚本', value: 'script', key: 'script' },
  { label: '模板', value: 'template', key: 'template' },
  { label: '工具集', value: 'toolset', key: 'toolset' },
];
```

### 修复效果
- 前端 Tab 过滤参数：`asset_type=image` ✅
- 后端查询条件：`WHERE asset_type = 'image'` ✅
- 结果：返回 34 条镜像资产记录 ✅

## 验证结果

### 数据库状态
- ✅ 34 个镜像资产（`asset_type='image'`）
- ✅ 所有镜像 tags 包含对应的 task_type
- ✅ 覆盖 25 个模型部署子场景

### 前端状态
- ✅ Vite 热更新成功 (09:58:29)
- ✅ "模型镜像"Tab 值更新为`'image'`
- ✅ 资产列表过滤逻辑正确

### 用户可见效果
访问 http://43.134.49.154:3000/assets/list，点击"模型镜像"Tab，现在可以看到：

**34 个镜像资产**,包括:
1. Ascend910C-MindSpore-Qwen2-72B (llm)
2. Ascend910C-MindSpore-InternVL2-26B (multimodal)
3. Ascend910B-MindSpore-Paraformer (speech_recognition)
4. MLU590-PyTorch-ResNet152 (image_classification)
5. Ascend910C-MindSpore-YOLOv8 (object_detection)
6. ... (共 34 个)

每个镜像显示:
- 名称、版本、分类
- 标签（彩色编码）
- 状态、共享范围
- 创建时间

## 技术说明

### 为什么后端有 `model` 和 `image` 两种类型？

后端 `AssetType` 枚举定义:
```python
class AssetType(str, enum.Enum):
    model = "model"        # 通用模型文件（未使用）
    image = "image"        # 模型部署镜像（chip+framework+model 组合）
```

设计意图:
- `model`: 单独的模型文件（如 .pth, .onnx）
- `image`: 完整的部署镜像（Docker 镜像，包含芯片驱动、框架、模型）

当前平台使用 `image` 类型来管理模型部署镜像，因为：
1. 包含完整的部署环境
2. 明确标注芯片、框架、模型组合
3. 支持 25 个子场景的分类

## 相关文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/utils/constants.ts` | 资产类型 value 从'model'改为'image' |
| `backend/app/models/asset.py` | 无需修改（已正确定义） |
| `frontend/src/pages/assets/AssetList.tsx` | 无需修改（动态使用 constants） |

## 后续建议

1. **清理后端枚举**: 如果确定不使用`model` 类型，可以考虑从 `AssetType` 中移除
2. **数据迁移**: 如果有旧的 `asset_type='model'` 数据，需要迁移到`'image'`
3. **文档更新**: 在 API 文档中明确说明 `asset_type='image'` 的含义
4. **类型安全**: 考虑使用 TypeScript 枚举与后端保持同步

---

**修复人员**: AI Assistant  
**修复时间**: 2026-03-21 09:58  
**状态**: ✅ 已完成
