# ProjectTen 需求变更说明

## 2026-03-21 需求变更

### 背景
用户要求对模型部署测试模块进行结构化改造，使每个子场景（task_type）都有独立的工具集、镜像和榜单。

### 需求详情

#### 1. 模型部署榜单改造
- **现状**：所有子场景的测试结果混合在一个榜单中，通过 task_type 字段筛选
- **目标**：每个子场景（llm、multimodal、object_detection 等 25 个）应该有独立的榜单页面/视图
- **实现**：
  - 前端：ModelBenchmarkList.tsx 已经支持按子场景 Tab 切换
  - 后端：API 已支持按 task_type 过滤，无需大改

#### 2. 资产列表改造
- **工具集（toolset）**：
  - 现状：工具集只有简单分类（算子测试工具/模型部署测试工具）
  - 目标：模型部署测试工具应该关联到具体子场景（如"LLM 测试工具"、"多模态测试工具"）
  - 实现：在 DigitalAsset 表中，工具集的 category 字段应该使用子场景标签（task_type）

- **镜像（image）**：
  - 现状：镜像通过 tags 字段存储子场景标签
  - 目标：镜像应该明确关联到子场景，每个子场景有专属镜像列表
  - 实现：保持 tags 字段，但前端展示时按子场景分组

#### 3. 模型部署测试创建流程改造
- **现状**：创建模型测试任务时，可以选择任意镜像和工具集
- **目标**：选择子场景后，只能选择该子场景对应的镜像和工具集
- **实现**：
  - 前端：EvalCreate.tsx 中，选择 task_type 后，过滤 toolset_id 和 image_id 的选项
  - 后端：创建任务时验证 image 和 toolset 是否与 task_type 匹配

#### 4. 榜单数据更新
- **现状**：测试完成后，结果写入 ModelBenchmark 表，task_type 来自任务
- **目标**：确保测试结果正确关联到子场景榜单
- **实现**：后端 service 层确保 task_type 正确传递

### 修改文件清单

#### 后端修改
1. `backend/app/models/asset.py` - 添加注释说明 category 字段用途
2. `backend/app/api/v1/assets.py` - 支持按子场景标签过滤工具集和镜像
3. `backend/app/api/v1/model_benchmark.py` - 支持按子场景查询可用镜像和工具集
4. `backend/app/services/evaluation_service.py` - 验证 image/toolset 与 task_type 匹配

#### 前端修改
1. `frontend/src/pages/evaluations/EvalCreate.tsx` - 根据子场景过滤镜像和工具集选项
2. `frontend/src/pages/assets/AssetList.tsx` - 按子场景展示工具集和镜像
3. `frontend/src/pages/benchmark/ModelBenchmarkList.tsx` - 已支持，无需修改

### 数据迁移
- 现有镜像的 tags 字段需要标准化，使用标准 task_type 值
- 现有工具集的 category 字段需要更新为子场景标签

### 测试验证
1. 创建 LLM 子场景任务，只能看到 LLM 相关的镜像和工具集
2. 测试完成后，结果只出现在 LLM 子场景榜单
3. 资产列表中，工具集和镜像按子场景分组展示
