# deeplink_op_test

`deeplink_op_test` is the standalone operator test runner used by ProjectTen for DeepLink operator evaluation.

It keeps the platform payload protocol stable and executes the currently supported BW1000 elementwise operator set locally with PyTorch on CPU.

## Positioning

- Tool name: `deeplink_op_test`
- Current target chip from platform payload: `hygon_bw1000` / BW1000 deployment server
- Execution backend in this standalone project: PyTorch CPU benchmark
- Operator library: local default operator library, reported as `local_default`
- Operator category: `元素操作类`
- Supported operators: `Abs`, `Clamp`, `Add`, `Sub`, `Mul`, `Div`, `Pow`, `Exp`, `Log`, `Sqrt`
- Result protocol: JSON output compatible with ProjectTen metrics ingestion

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

If the deployment server already has PyTorch installed, using that Python environment is also fine.

## Run

```bash
python main.py examples/bw1000_payload.json --output result.json
cat result.json
```

The runner accepts the ProjectTen payload shape directly. The important fields are:

```json
{
  "tool_name": "deeplink_op_test",
  "device": "hygon_bw1000",
  "chip": "hygon_bw1000",
  "device_count": 1,
  "operator_category": "元素操作类",
  "operator_library": "local_default",
  "operator_library_scope": "local",
  "operators": ["abs", "clamp", "add", "sub", "mul", "div", "pow", "exp", "log", "sqrt"],
  "warmup": 5,
  "repeat": 20,
  "dtype": "float32",
  "shape": [1024, 1024]
}
```

## Output

The result contains both summary metrics and per-operator metrics:

- `status`
- `execution_mode`: `real_pytorch_cpu`
- `device / chip_info / device_count`
- `operator_category / operator_library`
- `operators_tested`
- `operators[]`
- `results[]` alias for platform compatibility
- `summary.avg_ms / p95_ms / throughput / pass_rate`

Each operator result includes:

- `avg_ms`
- `p95_ms`
- `throughput` in `elements/s`
- `validation.max_abs_err`
- `validation.max_rel_err`
- `validation.passed`

## Notes

The current implementation intentionally benchmarks on CPU with PyTorch. When a native BW1000 runtime or DeepLink SDK entrypoint is ready, it can replace the PyTorch operator dispatch in `main.py` while keeping the same input and output JSON protocol.
