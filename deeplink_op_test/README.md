# deeplink_op_test

`deeplink_op_test` 是 ProjectTen 平台对齐的算子验证库。

当前 V1 目标：

- 工具名固定为 `deeplink_op_test`
- 平台 `/evaluations/create` 下发 JSON 与本库接收协议对齐
- 当前设备支持：`hygon_bw1000`（BW1000 部署服务器）
- 支持平台下发设备数量：`device_count`
- 当前算子库：默认部署服务器本地算子库（`local_default`）
- 当前分类支持：`元素操作类`
- 当前算子支持：`Abs`、`Clamp`、`Add`、`Sub`、`Mul`、`Div`、`Pow`、`Exp`、`Log`、`Sqrt`
- 执行结果可按统一 metrics 协议回传平台并展示在评测详情页

## 任务协议

平台在创建算子评测任务时，会将以下字段写入任务配置：

```json
{
  "tool_name": "deeplink_op_test",
  "deeplink_payload": {
    "tool": "deeplink_op_test",
    "device": "hygon_bw1000",
    "chip": "hygon_bw1000",
    "chip_info": {
      "chip": "hygon_bw1000",
      "supported_chip": "hygon_bw1000",
      "server_role": "deployment_server"
    },
    "device_count": 1,
    "category": "元素操作类",
    "operator_library": "local_default",
    "operator_library_label": "本地算子库",
    "operator_library_scope": "local",
    "operators": ["abs", "clamp", "add", "sub", "mul", "div", "pow", "exp", "log", "sqrt"],
    "scenario": "operator_accuracy" | "operator_accuracy_performance",
    "warmup": 5,
    "repeat": 20,
    "dtype": "float32"
  }
}
```

## 返回协议

执行结果返回到平台时，至少包含：

- `operators_tested`
- `supported_operators`
- `device / chip_info / device_count`
- `operator_category / operator_library`
- `summary.avg_ms / p95_ms / throughput`
- `results[]`

后续接入真实 BW1000 runtime 时，可直接替换当前模拟 runner，而不改平台协议。
