# ProjectTen 任务路由规范 v2

## 目标

统一以下两处的任务路由字段：

- DL 智能体创建页：`/dl-agent/create`
- 评测任务创建页：`/evaluations/create`

目标不是仅做页面展示一致，而是让两处最终都能输出/提交同一套可执行任务 JSON，用于后续真实评测、资源申请、结果采集、入库和排榜。

---

## 一、统一接口字段（Frontend → Backend）

无论是 **DL 智能体创建** 还是 **评测创建页**，最终提交给后端的核心字段统一为如下结构（v2）：

- `task`：评测大类
  - `operator`（算子评测）
  - `model_deployment`（模型部署评测）
- `scenario`：子场景
  - 算子：`operator_accuracy` / `operator_accuracy_performance`
  - 模型：`llm` / `speech_recognition` / `multimodal` / ...
- `chips`：芯片 tag（与资源/资产 tag 对齐），例如 `huawei_910c`
- `chip_num`：芯片数量（对应资源申请数量）
- `image_id`：镜像资产数据库 id（仅模型部署必填）
- `tool_id`：工具资产数据库 id（算子评测必填；模型部署可选/推荐）

### 模型部署示例

```json
{
  "name": "模型评测-llm-1712740800000",
  "description": "可选",
  "task": "model_deployment",
  "scenario": "llm",
  "chips": "huawei_910c",
  "chip_num": 1,
  "image_id": 70,
  "tool_id": 27,
  "visibility": "private",
  "priority": "medium"
}
```

### 算子评测示例

```json
{
  "name": "算子评测-operator_accuracy_performance-1712740800000",
  "description": "可选",
  "task": "operator",
  "scenario": "operator_accuracy_performance",
  "chips": "huawei_910c",
  "chip_num": 1,
  "tool_id": 1,
  "visibility": "private",
  "priority": "medium",
  "operator_lib_id": 2,
  "operator_categories": ["卷积类", "激活函数类"],
  "operator_count": 50
}
```

---

## 二、字段定义（v2）

### 1. task

评测大类。

当前统一为两类：

- `operator`：算子评测
- `model_deployment`：模型部署评测

说明：
- `task` 是后端一级路由字段。
- 后续如果增加训练、微调、强化学习，可在 v3 再扩展，不占用本版字段语义。

### 2. scenario

评测子场景。

#### 算子评测
- `operator_accuracy`：算子精度评测
- `operator_accuracy_performance`：算子精度+性能评测

#### 模型部署评测
当前按模型子场景扩展，例如：
- `llm`
- `speech_recognition`
- `multimodal`
- `ocr`
- `image_classification`
- `object_detection`
- `semantic_segmentation`
- ...

说明：
- `scenario` 取代旧规范中的 `taskType`。
- `task + scenario` 共同决定后端执行策略和前端展示。

### 3. chips

芯片 tag。

要求：
- 与资源系统、资产系统中的 tag 保持一致
- 不再使用页面临时派生值，不再混用展示名

示例：
- `huawei_910c`
- `huawei_910b`
- `nvidia_h200`
- `iluvatar_mr`

说明：
- `chips` 是资源/资产对齐字段。
- 可在后端按 tag 查询可用资源池、适配镜像、工具兼容性。

### 4. chip_num

芯片数量，对应实际资源申请数量。

示例：
- `1`
- `8`

说明：
- `chip_num` 取代旧规范中的 `deviceCount` / `card_count` 等混用命名。
- 前后端统一只保留一个字段。

### 5. image_id

镜像资产数据库主键 id。

约束：
- **仅模型部署评测必填**
- 算子评测可为空

说明：
- 本版先统一使用资产数据库真实 id，不再引入业务编号字段（如 `imageId=020023`）作为执行主字段。
- 如后续确需业务编码体系，可在资产层新增 `image_code`，但不影响 v2 路由主字段。

### 6. tool_id

工具资产数据库主键 id。

约束：
- **算子评测必填**
- **模型部署可选 / 推荐**

说明：
- 算子评测一般依赖明确的工具链/算子库，因此强制要求。
- 模型部署评测可能有默认执行器，但为了统一能力编排，推荐尽量传入。

---

## 三、必填规则

### 1. operator（算子评测）

必填：
- `task`
- `scenario`
- `chips`
- `chip_num`
- `tool_id`

选填：
- `image_id`
- `operator_lib_id`
- `operator_categories`
- `operator_count`
- `description`

约束：
- `task` 必须为 `operator`
- `scenario` 必须属于：`operator_accuracy` / `operator_accuracy_performance`
- `tool_id` 必须存在且可用于当前芯片 tag

### 2. model_deployment（模型部署评测）

必填：
- `task`
- `scenario`
- `chips`
- `chip_num`
- `image_id`

选填：
- `tool_id`
- `description`

约束：
- `task` 必须为 `model_deployment`
- `scenario` 必须属于模型部署子场景集合
- `image_id` 必须存在且适配当前芯片 tag

---

## 四、后端统一校验规则

后端按 v2 应进行如下统一校验：

### 规则 1：task 合法性校验

只允许：
- `operator`
- `model_deployment`

### 规则 2：scenario 与 task 必须匹配

- 当 `task=operator` 时，`scenario` 只能是：
  - `operator_accuracy`
  - `operator_accuracy_performance`
- 当 `task=model_deployment` 时，`scenario` 只能是模型部署定义的子场景之一，如：
  - `llm`
  - `speech_recognition`
  - `multimodal`
  - ...

### 规则 3：chips 必须与资源/资产 tag 对齐

- `chips` 必须为标准 tag
- 不允许前端传展示态字段替代 tag
- 后端可用 `chips` 直接做资源筛选和资产兼容性检查

### 规则 4：chip_num 必须为正整数

- `chip_num >= 1`
- 用于资源申请与后续执行调度

### 规则 5：image_id / tool_id 条件必填

- `task=operator` → `tool_id` 必填，`image_id` 可空
- `task=model_deployment` → `image_id` 必填，`tool_id` 可空但推荐

### 规则 6：资产兼容性校验

后端创建任务时应校验：

1. `image_id` 对应镜像是否存在
2. `tool_id` 对应工具是否存在
3. 镜像/工具是否支持 `chips`
4. 镜像/工具是否支持 `task + scenario`

---

## 五、DL 智能体输出 JSON 对齐规范

### 现状问题

当前 DL 智能体页面可能包含大量调试态字段，例如：

- `chipTag`
- `scenarioTag`
- `toolsetCandidates`
- `allImages`
- `imageCandidates`
- `step`

这些字段适合调试，不适合直接作为最终执行输入。

### v2 推荐输出

DL 智能体最终应输出可执行任务 JSON：

```json
{
  "task": "model_deployment",
  "scenario": "speech_recognition",
  "chips": "huawei_910c",
  "chip_num": 1,
  "image_id": 217,
  "tool_id": 8
}
```

### 可选 debug 信息

如需调试，可放在 `debug` 字段中：

```json
{
  "task": "model_deployment",
  "scenario": "speech_recognition",
  "chips": "huawei_910c",
  "chip_num": 1,
  "image_id": 217,
  "tool_id": 8,
  "debug": {
    "step": "image_id",
    "toolCandidates": 1,
    "allImages": 217,
    "imageCandidates": 1
  }
}
```

### 处理原则

- `chipTag`：展示字段，不进入执行 JSON
- `scenarioTag`：与 `scenario` 重复，不进入执行 JSON
- `toolsetCandidates` / `imageCandidates` / `allImages`：调试字段，不进入执行 JSON

---

## 六、评测任务创建页 JSON 对齐规范

`/evaluations/create` 最终提交给后端的 JSON，也应围绕同一套核心字段组织。

### 推荐提交体

```json
{
  "name": "语音识别评测-910C-20260413",
  "description": "",
  "task": "model_deployment",
  "scenario": "speech_recognition",
  "chips": "huawei_910c",
  "chip_num": 1,
  "image_id": 217,
  "tool_id": 8,
  "priority": "medium",
  "visibility": "private",
  "config": {}
}
```

---

## 七、与 v1 的主要变化

### v1 → v2 字段映射

- `taskCategory` → `task`
- `taskType` → `scenario`
- `deviceType` / `chipTag` → `chips`
- `deviceCount` / `card_count` → `chip_num`
- `imageId`（业务编号）→ `image_id`（数据库 id）
- `toolsetId`（业务编号）→ `tool_id`（数据库 id）

### 删除的内容

v2 不再把以下内容作为执行主字段：

- 场景编号段（如 `01/02/03`）
- `imageId/toolsetId` 的业务编码前缀校验
- “taskType 决定编号段”的路由规则

原因：
- 当前 ProjectTen 更需要的是**任务语义统一 + 资产数据库直连**
- 后端执行和资源申请更适合基于真实数据库 id + tag 做校验，而不是先引入一套额外业务编号体系

---

## 八、落地建议

### 第一步：前端统一字段名

前端提交统一改为：
- `task`
- `scenario`
- `chips`
- `chip_num`
- `image_id`
- `tool_id`

### 第二步：后端统一 DTO / Schema

后端任务创建接口统一接受 v2 字段，避免同时维护：
- `taskCategory/taskType/deviceType`
- `task/scenario/chips`

如需兼容旧接口，可在适配层做一次旧字段转新字段。

### 第三步：按 task 分流校验

- `operator`：重点校验 `tool_id`
- `model_deployment`：重点校验 `image_id`

### 第四步：资产系统补充兼容关系

镜像和工具资产中建议明确维护：
- 支持的芯片 tag
- 支持的任务大类
- 支持的场景列表

### 第五步：页面调试态与执行态分离

- 页面可以保留候选列表、候选数量、推导过程
- 最终提交后端时，只提交 v2 执行字段

---

## 九、示例

### 示例 1：算子精度评测

```json
{
  "task": "operator",
  "scenario": "operator_accuracy",
  "chips": "huawei_910c",
  "chip_num": 1,
  "tool_id": 12
}
```

### 示例 2：算子精度+性能评测

```json
{
  "task": "operator",
  "scenario": "operator_accuracy_performance",
  "chips": "huawei_910c",
  "chip_num": 8,
  "tool_id": 12
}
```

### 示例 3：LLM 模型部署评测

```json
{
  "task": "model_deployment",
  "scenario": "llm",
  "chips": "huawei_910c",
  "chip_num": 1,
  "image_id": 70,
  "tool_id": 27
}
```

### 示例 4：多模态模型部署评测

```json
{
  "task": "model_deployment",
  "scenario": "multimodal",
  "chips": "nvidia_h200",
  "chip_num": 8,
  "image_id": 125
}
```

---

## 十、结论

ProjectTen 的任务路由在 v2 中应统一为：

- `task` 决定评测大类
- `scenario` 决定子场景
- `chips` 表示资源/资产一致的芯片 tag
- `chip_num` 表示资源申请数量
- `image_id` / `tool_id` 直接使用资产数据库 id
- DL 智能体输出 JSON 与评测任务创建 JSON 必须共享同一套字段规范
- 候选数量、展示 tag、推导中间态仅保留为展示或调试信息，不进入最终执行层
