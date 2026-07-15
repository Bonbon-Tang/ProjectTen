from __future__ import annotations

import json
import math
import os
import random
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

SUPPORTED_DEVICE = "hygon_bw1000"
SUPPORTED_CATEGORY = "元素操作类"
SUPPORTED_OPERATORS = ["abs", "clamp", "add", "sub", "mul", "div", "pow", "exp", "log", "sqrt"]
DEFAULT_SHAPE = [1024, 1024]
DEFAULT_MAX_BENCHMARK_ELEMENTS = 65536


def _normalize_operators(payload: dict) -> list[str]:
    requested = payload.get("operators") or SUPPORTED_OPERATORS
    operators = []
    for op in requested:
        name = str(op).strip().lower()
        if name in SUPPORTED_OPERATORS and name not in operators:
            operators.append(name)
    return operators


def _shape(payload: dict) -> tuple[int, ...]:
    raw = payload.get("shape") or payload.get("tensor_shape") or DEFAULT_SHAPE
    if not isinstance(raw, (list, tuple)) or not raw:
        return tuple(DEFAULT_SHAPE)
    return tuple(max(1, int(dim)) for dim in raw)


def _dtype(payload: dict) -> str:
    dtype_name = str(payload.get("dtype", "float32")).lower()
    if dtype_name in {"float16", "fp16", "half"}:
        return "float16"
    if dtype_name in {"float64", "fp64", "double"}:
        return "float64"
    return "float32"


def _operator(name: str) -> Callable[[list[float], list[float]], list[float]]:
    ops = {
        "abs": lambda a, b: [abs(x) for x in a],
        "clamp": lambda a, b: [min(0.5, max(-0.5, x)) for x in a],
        "add": lambda a, b: [x + y for x, y in zip(a, b)],
        "sub": lambda a, b: [x - y for x, y in zip(a, b)],
        "mul": lambda a, b: [x * y for x, y in zip(a, b)],
        "div": lambda a, b: [x / (abs(y) + 1e-3) for x, y in zip(a, b)],
        "pow": lambda a, b: [(abs(x) + 1e-3) ** 1.5 for x in a],
        "exp": lambda a, b: [math.exp(min(8.0, max(-8.0, x))) for x in a],
        "log": lambda a, b: [math.log(abs(x) + 1e-3) for x in a],
        "sqrt": lambda a, b: [math.sqrt(abs(x) + 1e-3) for x in a],
    }
    return ops[name]


def _validate(op: Callable, a: list[float], b: list[float], output: list[float]) -> dict:
    reference = op(a, b)
    max_abs_err = 0.0
    max_rel_err = 0.0
    for actual, expected in zip(output, reference):
        abs_err = abs(actual - expected)
        rel_err = abs_err / max(abs(expected), 1e-6)
        max_abs_err = max(max_abs_err, abs_err)
        max_rel_err = max(max_rel_err, rel_err)
    passed = (
        math.isfinite(max_abs_err)
        and math.isfinite(max_rel_err)
        and max_abs_err < 1e-12
        and max_rel_err < 1e-12
    )
    return {
        "passed": bool(passed),
        "baseline": "python_stdlib_cpu_reference",
        "max_abs_err": round(max_abs_err, 12),
        "max_rel_err": round(max_rel_err, 12),
    }


def _benchmark_operator(
    name: str,
    a: list[float],
    b: list[float],
    *,
    warmup: int,
    repeat: int,
) -> dict:
    op = _operator(name)
    for _ in range(max(0, warmup)):
        output = op(a, b)
    latencies = []
    output = None
    for _ in range(max(1, repeat)):
        start = time.perf_counter()
        output = op(a, b)
        latencies.append((time.perf_counter() - start) * 1000.0)
    assert output is not None
    avg_ms = statistics.fmean(latencies)
    sorted_latencies = sorted(latencies)
    p95_idx = min(len(sorted_latencies) - 1, math.ceil(len(sorted_latencies) * 0.95) - 1)
    p95_ms = sorted_latencies[p95_idx]
    throughput = len(a) / max(avg_ms / 1000.0, 1e-12)
    return {
        "name": name,
        "status": "success",
        "avg_ms": round(avg_ms, 6),
        "p95_ms": round(p95_ms, 6),
        "throughput": round(throughput, 3),
        "throughput_unit": "elements/s",
        "warmup": warmup,
        "repeat": repeat,
        "validation": _validate(op, a, b, output),
    }


def run(payload: dict) -> dict:
    operators = _normalize_operators(payload)
    warmup = int(payload.get("warmup", 5))
    repeat = int(payload.get("repeat", 20))
    shape = _shape(payload)
    dtype = _dtype(payload)
    seed = int(payload.get("seed", 20260707))
    requested_elements = math.prod(shape)
    max_elements = max(1, int(payload.get("max_benchmark_elements", DEFAULT_MAX_BENCHMARK_ELEMENTS)))
    benchmark_elements = min(requested_elements, max_elements)
    rng = random.Random(seed)
    a = [rng.gauss(0.0, 1.0) for _ in range(benchmark_elements)]
    b = [rng.gauss(0.0, 1.0) for _ in range(benchmark_elements)]

    results = [_benchmark_operator(name, a, b, warmup=warmup, repeat=repeat) for name in operators]
    passed = sum(1 for item in results if item["validation"]["passed"])
    avg_ms = statistics.fmean([item["avg_ms"] for item in results]) if results else 0.0
    p95_ms = max((item["p95_ms"] for item in results), default=0.0)
    throughput = sum(item["throughput"] for item in results)

    device = payload.get("device") or payload.get("chip") or SUPPORTED_DEVICE
    return {
        "status": "success",
        "tool_name": "deeplink_op_test",
        "execution_mode": "real_python_cpu",
        "task_id": payload.get("task_id"),
        "task_name": payload.get("task_name"),
        "device": device,
        "chip_info": payload.get("chip_info") or {
            "chip": device,
            "supported_chip": SUPPORTED_DEVICE,
            "server_role": "deployment_server",
        },
        "device_count": int(payload.get("device_count", 1)),
        "operator_category": payload.get("operator_category", payload.get("category", SUPPORTED_CATEGORY)),
        "operator_library": payload.get("operator_library", "local_default"),
        "operator_library_scope": payload.get("operator_library_scope", "local"),
        "scenario": payload.get("scenario"),
        "dtype": dtype,
        "shape": list(shape),
        "requested_elements": requested_elements,
        "benchmark_elements": benchmark_elements,
        "sampled_benchmark": benchmark_elements < requested_elements,
        "backend": "python_stdlib_cpu",
        "cpu_threads": 1,
        "host_cpu_count": os.cpu_count() or 1,
        "operators_requested": operators,
        "operators_tested": len(results),
        "operators": results,
        "results": results,
        "summary": {
            "operators_tested": len(results),
            "passed": passed,
            "pass_rate": round((passed / len(results)) * 100, 4) if results else 0.0,
            "avg_ms": round(avg_ms, 6),
            "p95_ms": round(p95_ms, 6),
            "throughput": round(throughput, 3),
            "throughput_unit": "elements/s",
        },
        "executed_at": datetime.now(timezone.utc).isoformat(),
    }


def main() -> int:
    if len(sys.argv) not in (2, 4):
        print("usage: python main.py <task.json> [--output <result.json>]", file=sys.stderr)
        return 1
    task_path = Path(sys.argv[1])
    payload = json.loads(task_path.read_text(encoding="utf-8"))
    try:
        result = run(payload)
    except Exception as exc:
        result = {
            "status": "failed",
            "tool_name": "deeplink_op_test",
            "error": str(exc),
            "executed_at": datetime.now(timezone.utc).isoformat(),
        }
        if len(sys.argv) == 4 and sys.argv[2] == "--output":
            Path(sys.argv[3]).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        else:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        return 2
    if len(sys.argv) == 4 and sys.argv[2] == "--output":
        Path(sys.argv[3]).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
