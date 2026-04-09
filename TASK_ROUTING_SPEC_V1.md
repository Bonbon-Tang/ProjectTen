# ProjectTen 任务路由规范 v1

## 目标

统一以下两处的任务路由字段与编号体系：

- DL 智能体创建页：`/dl-agent/create`
- 评测任务创建页：`/evaluations/create`

目标不是仅做页面展示一致，而是让两处最终都能输出/提交同一套可执行任务 JSON，用于后续真实评测、结果采集、入库和排榜。

---

## 一、核心字段（最终执行层）

最终执行任务时，统一使用以下 5 个核心字段：

- `imageId`：镜像业务编号
- `deviceType`：芯片型号/设备类型
- `taskCategory`：测试大类
- `taskType`：测试小类/子场景
- `toolsetId`：测试工具业务编号

推荐任务执行 JSON：

```json
{
  "imageId": "030012",
  "deviceType": "huawei_910c",
  "taskCategory": "model_deployment_test",
  "taskType": "speech_recognition",
  "toolsetId": "0301"
}
```

---

## 二、字段定义

### 1. taskCategory

测试大类。当前先统一两类：

- `operator_test`：算子测试
- `model_deployment_test`：模型部署测试

> 说明：训练测试暂不纳入 v1 主链路。

### 2. taskType

测试小类/子场景。

#### 算子测试
- `operator_perf_accuracy`：性能+精度
- `operator_accuracy`：精度

#### 模型部署测试
直接对应子场景，例如：
- `llm`
- `speech_recognition`
- `multimodal`
- `ocr`
- `image_classification`
- `object_detection`
- `semantic_segmentation`
- ...（后续补全到 25 个子场景）

### 3. deviceType

芯片标准值，仅用于标识运行环境，不参与场景编号推导。

示例：
- `huawei_910c`
- `huawei_910b`
- `cambrian_590`
- `kunlun_p800`
- `hygon_bw1000`

### 4. imageId

镜像业务编号，6 位数字，格式：

```text
SSNNNN
```

- `SS`：场景编号段
- `NNNN`：该场景下镜像流水号

示例：
- `010001`：算子场景镜像 #1
- `020001`：LLM 场景镜像 #1
- `030001`：语音识别场景镜像 #1

### 5. toolsetId

工具业务编号，4 位数字，格式：

```text
SSNN
```

- `SS`：场景编号段
- `NN`：该场景下工具流水号

示例：
- `0101`：算子场景工具 #1
- `0201`：LLM 场景工具 #1
- `0301`：语音识别场景工具 #1

---

## 三、场景编号段规范

### 当前确定的映射（v1）

- `01`：算子测试
- `02`：模型部署 - 语言/LLM 场景
- `03`：模型部署 - 语音识别场景
- `04`：模型部署 - 多模态场景
- `05+`：模型部署其他子场景（后续按 25 个子场景继续扩展）

说明：
- 算子测试统一使用 `01`
- 模型部署按子场景分段编号
- 同一子场景的镜像和工具必须使用相同的前缀 `SS`

---

## 四、强校验规则

### 规则 1：taskType 决定场景编号段

例如：
- `operator_perf_accuracy` / `operator_accuracy` → `01`
- `llm` → `02`
- `speech_recognition` → `03`
- `multimodal` → `04`

### 规则 2：imageId 前缀与 toolsetId 前缀必须一致

必须满足：

```text
imageId[:2] == toolsetId[:2]
```

示例：
- `imageId=020017`，`toolsetId=0201` → 合法
- `imageId=020017`，`toolsetId=0301` → 非法

### 规则 3：编号前缀必须与 taskType 一致

例如：
- `taskType=speech_recognition` → 前缀必须是 `03`
- 则 `imageId` 必须是 `03xxxx`
- 且 `toolsetId` 必须是 `03xx`

### 规则 4：deviceType 不参与场景前缀推导

- `deviceType` 只负责芯片/设备环境
- `taskType` 负责场景语义
- `imageId/toolsetId` 负责编号对齐

---

## 五、DL 智能体输出 JSON 对齐规范

### 现状问题

当前 DL 智能体页面包含大量调试态字段，例如：

- `chipTag`
- `scenarioTag`
- `toolsetCandidates`
- `allImages`
- `imageCandidates`
- `step`

这些字段适合调试，不适合直接作为最终执行输入。

### v1 推荐输出

DL 智能体最终应输出可执行任务 JSON：

```json
{
  "taskCategory": "model_deployment_test",
  "taskType": "speech_recognition",
  "deviceType": "huawei_910c",
  "imageId": "030012",
  "toolsetId": "0301"
}
```

### 可选 debug 信息

如需调试，可放在 `debug` 字段中：

```json
{
  "taskCategory": "model_deployment_test",
  "taskType": "speech_recognition",
  "deviceType": "huawei_910c",
  "imageId": "030012",
  "toolsetId": "0301",
  "debug": {
    "step": "imageId",
    "toolsetCandidates": 1,
    "allImages": 217,
    "imageCandidates": 1
  }
}
```

### 处理原则

- `chipTag`：展示字段，可由 `deviceType` 派生，不进入执行 JSON
- `scenarioTag`：语义上与 `taskType` 重复，不进入执行 JSON
- `toolsetCandidates` / `imageCandidates` / `allImages`：调试字段，不进入执行 JSON

---

## 六、评测任务创建 JSON 对齐规范

`/evaluations/create` 最终提交给后端的 JSON，也应围绕同一套核心字段组织。

### 推荐提交体

```json
{
  "name": "语音识别评测-910C-20260409",
  "description": "",
  "taskCategory": "model_deployment_test",
  "taskType": "speech_recognition",
  "deviceType": "huawei_910c",
  "deviceCount": 1,
  "imageId": "030012",
  "toolsetId": "0301",
  "priority": "medium",
  "visibility": "private",
  "config": {}
}
```

### 当前系统内部建议保留的双层 ID

为兼容现有数据库自增 ID，后端建议同时保留：

- 数据库主键：`image_db_id` / `toolset_db_id`
- 业务编号：`imageId` / `toolsetId`

示例：

```json
{
  "imageDbId": 217,
  "imageId": "030012",
  "toolsetDbId": 8,
  "toolsetId": "0301"
}
```

说明：
- 执行与路由用业务编号
- 数据库关联继续可用内部主键

---

## 七、当前代码与规范的差异

### 1. taskCategory 命名不一致

当前前后端存在：
- `operator_test`
- `model_test`

规范建议统一为：
- `operator_test`
- `model_deployment_test`

### 2. imageId / toolsetId 目前还是数据库数值 ID

当前前端、API、后端主要使用数据库 `id`：
- `image_id: number`
- `toolset_id: number`

规范要求新增业务编号字段：
- `imageId: string`（如 `030012`）
- `toolsetId: string`（如 `0301`）

### 3. DL 智能体当前输出中存在冗余字段

- `chipTag` 与 `deviceType` 信息重复
- `scenarioTag` 与 `taskType` 语义重复
- `imageCandidates` / `toolsetCandidates` / `allImages` 属于调试态

---

## 八、落地建议

### 第一步：先落规范

统一确定：
- `taskCategory`
- `taskType`
- `deviceType`
- `imageId`
- `toolsetId`

### 第二步：给资产补业务编号字段

建议在镜像资产、工具资产中新增：
- `image_code`
- `toolset_code`

### 第三步：DL 智能体改为输出业务编号

- 不再只输出数据库自增 ID
- 以业务编号为主
- 调试信息移入 `debug`

### 第四步：评测创建页改为提交同一套字段

- 提交时带业务编号
- 后端内部再解析到具体数据库资产

### 第五步：后端加一致性校验

任务创建时校验：

1. `taskType` 是否合法
2. `imageId` 前缀是否匹配 `taskType`
3. `toolsetId` 前缀是否匹配 `taskType`
4. `imageId[:2] == toolsetId[:2]`
5. 该镜像是否支持指定 `deviceType`

---

## 九、示例

### 示例 1：算子测试

```json
{
  "imageId": "010008",
  "deviceType": "huawei_910c",
  "taskCategory": "operator_test",
  "taskType": "operator_perf_accuracy",
  "toolsetId": "0101"
}
```

### 示例 2：LLM 部署测试

```json
{
  "imageId": "020023",
  "deviceType": "huawei_910c",
  "taskCategory": "model_deployment_test",
  "taskType": "llm",
  "toolsetId": "0201"
}
```

### 示例 3：语音识别部署测试

```json
{
  "imageId": "030004",
  "deviceType": "huawei_910c",
  "taskCategory": "model_deployment_test",
  "taskType": "speech_recognition",
  "toolsetId": "0301"
}
```

---

## 十、结论

ProjectTen 的任务路由应统一为：

- `taskType` 决定场景编号段
- `imageId` 与 `toolsetId` 前缀必须一致
- `deviceType` 仅表示芯片环境
- DL 智能体输出 JSON 与评测任务创建 JSON 必须共享同一套字段规范
- `chipTag`、`scenarioTag`、候选数量等仅保留为展示或调试信息，不进入最终执行层
