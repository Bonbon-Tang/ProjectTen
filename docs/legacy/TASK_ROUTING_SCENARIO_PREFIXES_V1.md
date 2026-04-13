# ProjectTen 子场景编号段对照表（v2 对齐说明）

> 本文件保留原路径仅用于兼容历史链接，内容已按 v2 语义重写。
> 
> **唯一主规范**：`docs/legacy/TASK_ROUTING_SPEC_V2.md`

## v2 执行字段

- `task`
- `scenario`
- `chips`
- `chip_num`
- `image_id`
- `tool_id`

## 字段语义

- `task`
  - `operator`
  - `model_deployment`
- `scenario`
  - 算子：`operator_accuracy` / `operator_accuracy_performance`
  - 模型：`llm` / `speech_recognition` / `multimodal` / ...
- `chips`
  - 与资源/资产系统一致的芯片 tag，例如 `huawei_910c`
- `chip_num`
  - 设备数量
- `image_id`
  - 资产数据库中的镜像 id
- `tool_id`
  - 资产数据库中的工具 id

## 路由与编号段关系

虽然 v2 执行 JSON 不再直接使用旧业务编号字段作为主字段，但系统内部仍可根据 `scenario` 推导对应编号段，用于：

1. 资产编码前缀校验
2. 镜像/工具是否与同一子场景对齐的校验
3. 历史兼容展示

## scenario 对照表

| 编号段 | task | scenario | 中文名 |
|---|---|---|---|
| 01 | operator | operator_accuracy / operator_accuracy_performance | 算子测试 |
| 02 | model_deployment | llm | 语言 / LLM |
| 03 | model_deployment | speech_recognition | 语音识别 |
| 04 | model_deployment | multimodal | 多模态 |
| 05 | model_deployment | image_classification | 图像分类 |
| 06 | model_deployment | object_detection | 目标检测 |
| 07 | model_deployment | semantic_segmentation | 语义分割 |
| 08 | model_deployment | text_generation | 文本生成 |
| 09 | model_deployment | machine_translation | 机器翻译 |
| 10 | model_deployment | sentiment_analysis | 情感分析 |
| 11 | model_deployment | question_answering | 问答系统 |
| 12 | model_deployment | text_summarization | 文本摘要 |
| 13 | model_deployment | speech_synthesis | 语音合成 |
| 14 | model_deployment | image_generation | 图像生成 |
| 15 | model_deployment | video_understanding | 视频理解 |
| 16 | model_deployment | ocr | OCR |
| 17 | model_deployment | recommendation | 推荐系统 |
| 18 | model_deployment | anomaly_detection | 异常检测 |
| 19 | model_deployment | time_series | 时序预测 |
| 20 | model_deployment | reinforcement_learning | 强化学习 |
| 21 | model_deployment | graph_neural_network | 图神经网络 |
| 22 | model_deployment | medical_imaging | 医学影像 |
| 23 | model_deployment | autonomous_driving | 自动驾驶 |
| 24 | model_deployment | robot_control | 机器人控制 |
| 25 | model_deployment | code_generation | 代码生成 |
| 26 | model_deployment | knowledge_graph | 知识图谱 |

## 强校验

1. `scenario` 必须映射到唯一编号段 `SS`
2. 若存在历史资产编码，则镜像与工具编码前缀必须一致
3. 历史资产编码前缀必须与 `scenario` 对应编号段一致
4. `chips` 仅表示芯片环境，不参与 `SS` 推导
5. 执行阶段以 `image_id` / `tool_id` 为准，不以旧业务编号字段作为执行主字段
