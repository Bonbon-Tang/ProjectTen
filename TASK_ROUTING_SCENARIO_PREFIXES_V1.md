# ProjectTen 子场景编号段对照表 v1

> 说明：本表用于 `taskType`、`imageId`、`toolsetId` 的统一路由与校验。

## 编号规则

- 镜像编号：`SSNNNN`
  - `SS`：场景编号段
  - `NNNN`：该场景下镜像流水号
- 工具编号：`SSNN`
  - `SS`：场景编号段
  - `NN`：该场景下工具流水号

## 场景对照表（v1）

| 场景段 | taskCategory | taskType | 中文名 | imageId 示例 | toolsetId 示例 |
|---|---|---|---|---|---|
| 01 | operator_test | operator_perf_accuracy / operator_accuracy | 算子测试 | 010001 | 0101 |
| 02 | model_deployment_test | llm | 语言 / LLM | 020001 | 0201 |
| 03 | model_deployment_test | speech_recognition | 语音识别 | 030001 | 0301 |
| 04 | model_deployment_test | multimodal | 多模态 | 040001 | 0401 |
| 05 | model_deployment_test | image_classification | 图像分类 | 050001 | 0501 |
| 06 | model_deployment_test | object_detection | 目标检测 | 060001 | 0601 |
| 07 | model_deployment_test | semantic_segmentation | 语义分割 | 070001 | 0701 |
| 08 | model_deployment_test | text_generation | 文本生成 | 080001 | 0801 |
| 09 | model_deployment_test | machine_translation | 机器翻译 | 090001 | 0901 |
| 10 | model_deployment_test | sentiment_analysis | 情感分析 | 100001 | 1001 |
| 11 | model_deployment_test | question_answering | 问答系统 | 110001 | 1101 |
| 12 | model_deployment_test | text_summarization | 文本摘要 | 120001 | 1201 |
| 13 | model_deployment_test | speech_synthesis | 语音合成 | 130001 | 1301 |
| 14 | model_deployment_test | image_generation | 图像生成 | 140001 | 1401 |
| 15 | model_deployment_test | video_understanding | 视频理解 | 150001 | 1501 |
| 16 | model_deployment_test | ocr | OCR | 160001 | 1601 |
| 17 | model_deployment_test | recommendation | 推荐系统 | 170001 | 1701 |
| 18 | model_deployment_test | anomaly_detection | 异常检测 | 180001 | 1801 |
| 19 | model_deployment_test | time_series | 时序预测 | 190001 | 1901 |
| 20 | model_deployment_test | reinforcement_learning | 强化学习 | 200001 | 2001 |
| 21 | model_deployment_test | graph_neural_network | 图神经网络 | 210001 | 2101 |
| 22 | model_deployment_test | medical_imaging | 医学影像 | 220001 | 2201 |
| 23 | model_deployment_test | autonomous_driving | 自动驾驶 | 230001 | 2301 |
| 24 | model_deployment_test | robot_control | 机器人控制 | 240001 | 2401 |
| 25 | model_deployment_test | code_generation | 代码生成 | 250001 | 2501 |
| 26 | model_deployment_test | knowledge_graph | 知识图谱 | 260001 | 2601 |

## 强校验

1. `taskType` 必须映射到唯一场景段 `SS`
2. `imageId[:2] == toolsetId[:2]`
3. `imageId[:2]` / `toolsetId[:2]` 必须与 `taskType` 对应场景段一致
4. `deviceType` 仅表示芯片环境，不参与 `SS` 推导
