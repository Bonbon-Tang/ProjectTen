# 模型部署测试数据初始化报告

## 执行时间
2026-03-21 09:45

## 任务目标
为 25 个模型部署子场景各创建至少一个镜像和一个评测工具集，确保所有资产的 tags 包含对应的 task_type，支持前端过滤逻辑正常工作。

## 25 个子场景清单

| # | 子场景 | Task Type | 镜像数 | 工具集数 | 状态 |
|---|--------|-----------|--------|----------|------|
| 1 | 大语言模型 | llm | 6 | 1 | ✅ |
| 2 | 多模态模型 | multimodal | 2 | 1 | ✅ |
| 3 | 语音识别 | speech_recognition | 2 | 1 | ✅ |
| 4 | 图像分类 | image_classification | 2 | 1 | ✅ |
| 5 | 目标检测 | object_detection | 2 | 1 | ✅ |
| 6 | 语义分割 | semantic_segmentation | 2 | 1 | ✅ |
| 7 | 文本生成 | text_generation | 6 | 1 | ✅ |
| 8 | 机器翻译 | machine_translation | 1 | 1 | ✅ |
| 9 | 情感分析 | sentiment_analysis | 1 | 1 | ✅ |
| 10 | 问答系统 | question_answering | 3 | 1 | ✅ |
| 11 | 文本摘要 | text_summarization | 1 | 1 | ✅ |
| 12 | 语音合成 | speech_synthesis | 2 | 1 | ✅ |
| 13 | 图像生成 | image_generation | 2 | 1 | ✅ |
| 14 | 视频理解 | video_understanding | 1 | 1 | ✅ |
| 15 | 文字识别 (OCR) | ocr | 1 | 1 | ✅ |
| 16 | 推荐系统 | recommendation | 1 | 1 | ✅ |
| 17 | 异常检测 | anomaly_detection | 1 | 1 | ✅ |
| 18 | 时序预测 | time_series | 1 | 1 | ✅ |
| 19 | 强化学习 | reinforcement_learning | 1 | 1 | ✅ |
| 20 | 图神经网络 | graph_neural_network | 1 | 1 | ✅ |
| 21 | 医学影像 | medical_imaging | 1 | 1 | ✅ |
| 22 | 自动驾驶 | autonomous_driving | 1 | 1 | ✅ |
| 23 | 机器人控制 | robot_control | 1 | 1 | ✅ |
| 24 | 代码生成 | code_generation | 2 | 1 | ✅ |
| 25 | 知识图谱 | knowledge_graph | 1 | 1 | ✅ |

**总计**: 38 个镜像，25 个专用工具集

## 数据详情

### 新增镜像（8 个）
1. MLU590-PyTorch-DeepLabV3 (semantic_segmentation)
2. Ascend910B-MindSpore-NMT-Transformer (machine_translation)
3. Ascend910C-MindSpore-Qwen-72B-Chat (question_answering)
4. Ascend910B-PyTorch-BART-Large (text_summarization)
5. MLU590-PyTorch-VITS (speech_synthesis)
6. Ascend910C-MindSpore-SDXL-1.0 (image_generation)
7. Ascend910C-PyTorch-VideoMAE (video_understanding)
8. Ascend910B-MindSpore-DeepFM (recommendation)
9. MLU590-PyTorch-AutoEncoder (anomaly_detection)
10. Ascend910B-MindSpore-Informer (time_series)
11. Ascend910C-PyTorch-PPO-Agent (reinforcement_learning)
12. Ascend910B-MindSpore-GAT (graph_neural_network)
13. MLU590-PyTorch-3D-UNet (medical_imaging)
14. Ascend910C-MindSpore-Apollo-Perception (autonomous_driving)
15. Ascend910B-PyTorch-RL-Control (robot_control)
16. Ascend910C-MindSpore-CodeQwen-7B (code_generation)
17. P800-PaddlePaddle-KG-BERT (knowledge_graph)
18. P800-PaddlePaddle-ERNIE-sentiment (sentiment_analysis)

### 新增工具集（24 个）
为每个子场景创建了专用评测工具集，命名规范：`{场景名称} 评测工具`

示例：
- LLM 性能评测工具 (llm)
- 多模态模型评测工具 (multimodal)
- 语音识别评测工具 (speech_recognition)
- ... (共 25 个)

### 标签规范

#### 镜像 Tags
```json
{
  "name": "Ascend910C-MindSpore-Qwen2-72B",
  "tags": [
    "llm",              // ✅ 必需：task_type，用于前端过滤
    "Ascend910C",       // 芯片
    "MindSpore",        // 框架
    "Qwen2-72B",        // 模型
    "大语言模型"         // 中文标签
  ]
}
```

#### 工具集 Tags
```json
{
  "name": "LLM 性能评测工具",
  "tags": [
    "llm",              // ✅ 必需：task_type，用于前端过滤
    "性能测试",          // 测试类型
    "准确率测试",
    "吞吐量测试",
    "延迟测试"
  ]
}
```

## 验证结果

### 前端过滤逻辑
- ✅ `getAvailableImages(task_type)` - 根据 task_type 过滤镜像
- ✅ `getAvailableToolsets(task_type)` - 根据 task_type 过滤工具集
- ✅ 创建任务时，选择子场景后自动加载对应资源

### 后端验证逻辑
- ✅ 创建模型部署任务时验证镜像 tags 包含 task_type
- ✅ 不匹配的镜像会被拒绝并返回错误提示

### 数据完整性
- ✅ 25 个子场景全部覆盖
- ✅ 每个子场景至少有 1 个镜像和 1 个工具集
- ✅ 所有资产 tags 包含对应的 task_type
- ✅ 数据可在前端正常过滤和显示

## 覆盖的芯片设备

| 芯片 | 镜像数 | 占比 |
|------|--------|------|
| Ascend910C | 18 | 47% |
| Ascend910B | 10 | 26% |
| MLU590 | 7 | 18% |
| P800 | 3 | 8% |

## 覆盖的框架

| 框架 | 镜像数 | 占比 |
|------|--------|------|
| MindSpore | 20 | 53% |
| PyTorch | 14 | 37% |
| PaddlePaddle | 4 | 10% |

## 文件清单

| 文件 | 说明 |
|------|------|
| `backend/scripts/seed_model_assets.py` | 数据初始化脚本 |
| `backend/app/api/v1/model_benchmark.py` | 新增 `/toolsets` 端点 |
| `backend/app/services/evaluation_service.py` | 镜像兼容性验证 |
| `frontend/src/api/modelBenchmark.ts` | `getAvailableToolsets()` 函数 |
| `frontend/src/pages/evaluations/EvalCreate.tsx` | 动态加载过滤逻辑 |

## 使用示例

### 创建 LLM 模型部署测试
1. 访问 http://43.134.49.154:3000/evaluations/create
2. 选择"模型评测" → "大语言模型"
3. 工具集下拉框显示：**LLM 性能评测工具**
4. 镜像下拉框显示 6 个 LLM 相关镜像（如 Ascend910C-MindSpore-Qwen2-72B）
5. 选择设备、配置参数，提交任务

### 创建多模态测试
1. 选择"模型评测" → "多模态模型"
2. 工具集：**多模态模型评测工具**
3. 镜像：Ascend910C-MindSpore-InternVL2-26B、MLU590-PyTorch-Qwen-VL-Chat

## 后续工作建议

1. **丰富镜像数据**: 为热门场景（如 LLM）添加更多芯片/框架组合的镜像
2. **性能基准**: 为每个镜像添加预置的性能基准数据
3. **文档完善**: 在 README 中说明镜像和工具集的命名规范
4. **自动化测试**: 为每个子场景创建示例测试任务
5. **数据备份**: 定期备份 SQLite 数据库

## 服务状态

| 服务 | 地址 | 状态 |
|------|------|------|
| 前端 | http://43.134.49.154:3000 | ✅ 运行中 |
| 后端 API | http://43.134.49.154:8000 | ✅ 运行中 |
| 数据库 | SQLite | ✅ 正常 |

---

**执行人员**: AI Assistant  
**执行时间**: 2026-03-21 09:45  
**任务状态**: ✅ 完成
