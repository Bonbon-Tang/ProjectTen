# 模型部署测试子场景隔离实现说明

## 实现日期
2026-03-21

## 需求概述
将模型部署测试按 25 个子场景（task_type）进行隔离，确保：
1. 每个子场景有独立的榜单
2. 资产列表中工具集和镜像按子场景分类
3. 创建测试任务时，每个场景只能选择对应的镜像和工具集
4. 测试结果更新到对应子场景的 benchmark

## 已完成的修改

### 后端修改

#### 1. `backend/app/api/v1/model_benchmark.py`
**新增 API 端点**: `GET /api/v1/model-benchmark/toolsets`
- 支持按 `task_type` 参数过滤工具集
- 通过 tags 和 category 字段匹配子场景
- 返回与指定子场景兼容的测试工具列表

**修改内容**:
```python
@router.get("/toolsets")
def get_available_toolsets(
    task_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get available toolsets for model deployment test, optionally filtered by sub-scenario tag."""
    # 实现按 task_type 过滤工具集的逻辑
    # 支持 tags 匹配和 category 关键词匹配
```

#### 2. `backend/app/services/evaluation_service.py`
**新增验证逻辑**: 在创建模型部署测试任务时验证镜像兼容性
- 检查所选镜像的 tags 是否包含任务的 task_type
- 如果不匹配，抛出 ValueError 阻止任务创建

**修改内容**:
```python
if task_category == "model_test":
    if not kwargs.get("image_id"):
        raise ValueError("模型部署测试必须选择镜像 (image_id)")
    
    # Validate image matches task_type (check tags)
    image_id = kwargs.get("image_id")
    task_type = kwargs.get("task_type")
    if image_id and task_type:
        from app.models.asset import DigitalAsset
        image = db.query(DigitalAsset).filter(DigitalAsset.id == image_id).first()
        if image:
            image_tags = image.tags or []
            if task_type not in image_tags:
                raise ValueError(
                    f"所选镜像 '{image.name}' 不适用于 {task_type} 场景。镜像标签：{image_tags}"
                )
```

### 前端修改

#### 1. `frontend/src/api/modelBenchmark.ts`
**新增 API 函数**:
```typescript
export function getAvailableToolsets(task_type?: string) {
  return api.get('/model-benchmark/toolsets', { params: { task_type } });
}
```

#### 2. `frontend/src/pages/evaluations/EvalCreate.tsx`
**修改内容**:

a) **fetchToolsets 函数**: 添加 scenarioType 参数
- 当 taskCategory 为 'model_test' 且指定了 scenarioType 时，调用新的 `/model-benchmark/toolsets` 端点
- 否则使用原有的 assets 端点获取所有工具集

b) **fetchModelImages 函数**: 添加 scenarioType 参数
- 直接传递给 `getAvailableImages(scenarioType)` 实现过滤

c) **useEffect 钩子**: 动态加载资源
```typescript
// 不在 mount 时加载，等待 taskType 选择
useEffect(() => {
  fetchOperatorLibs();
  fetchDevices();
  fetchOperatorCategories();
}, []);

// 当 taskType 变化时，加载对应的工具集和镜像
useEffect(() => {
  if (taskCategory === 'model_test' && taskType) {
    fetchToolsets(taskType);
    fetchModelImages(taskType);
  } else if (taskCategory === 'operator_test') {
    fetchToolsets();
  }
}, [taskCategory, taskType]);
```

#### 3. `frontend/src/pages/benchmark/ModelBenchmarkList.tsx`
**无需修改**: 已支持按子场景 Tab 切换查看榜单

## 数据要求

### 镜像数据 (DigitalAsset, asset_type='image')
**tags 字段必须包含标准 task_type 值**,例如:
- `llm` - 大语言模型镜像
- `multimodal` - 多模态镜像
- `object_detection` - 目标检测镜像
- `image_classification` - 图像分类镜像
- `speech_recognition` - 语音识别镜像
- 等等（共 25 个子场景）

### 工具集数据 (DigitalAsset, asset_type='toolset')
**推荐方式**: tags 字段包含 task_type
**兼容方式**: category 字段包含关键词
- `LLM`, `大语言模型` → llm 场景
- `多模态`, `Multimodal` → multimodal 场景
- `图像分类`, `Image Classification` → image_classification 场景
- 等等

## 用户体验流程

### 创建模型部署测试任务
1. 用户选择"模型评测"大类
2. 选择子场景（如"大语言模型"）
3. **系统自动过滤**: 
   - 工具集下拉框只显示 LLM 相关的测试工具
   - 镜像下拉框只显示 tags 包含 `llm` 的镜像
4. 选择设备和其他参数
5. 提交任务时，后端再次验证镜像兼容性
6. 测试完成后，结果写入 `model_benchmarks` 表，`task_type` 字段为 `llm`
7. 用户在 Benchmark 页面的"大语言模型"Tab 下可以看到测试结果

### 查看榜单
1. 进入 Benchmark → 模型部署榜单
2. 通过顶部 Tab 切换不同子场景
3. 每个 Tab 显示对应 task_type 的排名
4. 支持按准确率、吞吐量、性能评分等排序

## 测试验证

### 验证点
1. ✅ 后端 API `/model-benchmark/toolsets?task_type=llm` 返回过滤后的工具集
2. ✅ 后端 API `/model-benchmark/images?task_type=llm` 返回过滤后的镜像
3. ✅ 创建任务时，选择不匹配的镜像会被后端拒绝
4. ✅ 前端创建页面，选择子场景后工具集和镜像列表自动更新
5. ✅ 榜单按子场景正确分组显示

### 待验证
- [ ] 实际创建 LLM 测试任务并验证结果出现在正确榜单
- [ ] 测试所有 25 个子场景的过滤逻辑
- [ ] 验证现有数据的 tags 是否符合要求

## 后续优化建议

1. **数据迁移**: 为现有镜像和工具集添加正确的 tags
2. **UI 增强**: 在资产列表页面添加按子场景分组的视图
3. **错误提示**: 前端选择子场景前禁用镜像和工具集选择框
4. **文档更新**: 在 README 中说明镜像 tags 的规范
5. **批量管理**: 提供批量更新镜像 tags 的工具

## 相关文件
- 后端 API: `backend/app/api/v1/model_benchmark.py`
- 后端 Service: `backend/app/services/evaluation_service.py`
- 前端 API: `frontend/src/api/modelBenchmark.ts`
- 前端页面: `frontend/src/pages/evaluations/EvalCreate.tsx`
- 前端榜单: `frontend/src/pages/benchmark/ModelBenchmarkList.tsx`
