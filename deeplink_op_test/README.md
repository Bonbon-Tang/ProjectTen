# deeplink_op_test

`deeplink_op_test` is the standalone operator test runner used by ProjectTen for DeepLink operator evaluation.

It keeps the platform payload protocol stable and executes the currently supported Huawei Ascend 910B elementwise operator set with the Python standard library on CPU.

## Positioning

- Tool name: `deeplink_op_test`
- Current target chip from platform payload: `huawei_910b` / Huawei Ascend 910B execution server
- Execution backend in this standalone project: Python standard-library CPU benchmark
- Operator library: local default operator library, reported as `local_default`
- Operator category: `元素操作类`
- Supported operators: `Abs`, `Clamp`, `Add`, `Sub`, `Mul`, `Div`, `Pow`, `Exp`, `Log`, `Sqrt`
- Result protocol: JSON output compatible with ProjectTen metrics ingestion

## Install

The CPU runner only uses the Python standard library. It does not install or
import Torch or NumPy:

```bash
python3 -c 'import sys; print(sys.executable); print(sys.version)'
```

Set `DEEPLINK_OP_TEST_REMOTE_PYTHON` to the printed Python path when it is not
the default `python3`. `requirements.txt` is intentionally empty, so running
the CPU benchmark cannot replace any server-side Torch or NumPy build.

## Run

```bash
python main.py examples/bw1000_payload.json --output result.json
cat result.json
```

## Remote execution mode (SSH)

The platform controller runs as `ailab@10.201.6.19`. For the supported profile only
(`deeplink_op_test` + `huawei_910b` + `元素操作类`), it sends the payload to
`root@10.201.21.35` over SSH. The controller streams its local `main.py` source
and task payload through stdin, so the node does not need a ProjectTen checkout
or a persistent agent service. Other combinations are rejected as unsupported.

Configure an SSH alias on `10.201.6.19`:

```sshconfig
Host ascend910b-runner
    HostName 10.201.21.35
    User root
    IdentityFile ~/.ssh/projectten_910b
    IdentitiesOnly yes
    BatchMode yes
    ConnectTimeout 10
    ServerAliveInterval 15
    ServerAliveCountMax 3
    StrictHostKeyChecking yes
```

Verify the remote runner directly:

```bash
printf '%s\n' '{"tool_name":"deeplink_op_test","device":"huawei_910b","operator_category":"元素操作类","operators":["abs"],"warmup":1,"repeat":1}' \
  | python ssh_runner.py
```

ProjectTen reads these optional environment variables on `10.201.6.19`:

```bash
export DEEPLINK_OP_TEST_SSH_TARGET=root@10.201.21.35
export DEEPLINK_OP_TEST_REMOTE_PYTHON=python3
export DEEPLINK_OP_TEST_TIMEOUT=300
```

The runner streams code and payload over SSH stdin/stdout and uses keepalive,
strict host-key checking, a
300-second timeout, and remote `flock` so only one benchmark occupies the
execution server at a time. The current backend is `python_stdlib_cpu`; this
must not be confused with native Ascend 910B execution.

The runner accepts the ProjectTen payload shape directly. The important fields are:

```json
{
  "tool_name": "deeplink_op_test",
  "device": "huawei_910b",
  "chip": "huawei_910b",
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
- `execution_mode`: `real_python_cpu`
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

The current implementation intentionally benchmarks on CPU with the Python standard library. For large requested tensors it transparently benchmarks at most 65,536 elements and reports both `requested_elements` and `benchmark_elements`. When a native Ascend 910B runtime or DeepLink SDK entrypoint is ready, it can replace the standard-library operator dispatch in `main.py` while keeping the same input and output JSON protocol.
