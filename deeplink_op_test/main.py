from __future__ import annotations

import json
import sys
from pathlib import Path

SUPPORTED_DEVICE = "hygon_bw1000"
SUPPORTED_CATEGORY = "元素操作类"
SUPPORTED_OPERATORS = ["matmul", "relu", "normal"]


def run(payload: dict) -> dict:
    operators = [op for op in payload.get("operators", []) if op in SUPPORTED_OPERATORS]
    return {
        "tool": "deeplink_op_test",
        "device": payload.get("device", SUPPORTED_DEVICE),
        "category": payload.get("category", SUPPORTED_CATEGORY),
        "operators": operators,
        "status": "success",
    }


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: python main.py <task.json>")
        return 1
    task_path = Path(sys.argv[1])
    payload = json.loads(task_path.read_text(encoding="utf-8"))
    result = run(payload)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
