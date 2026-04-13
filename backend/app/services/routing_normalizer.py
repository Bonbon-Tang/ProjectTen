from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple


TASK_MAP = {
    # public v2 task -> internal category
    "operator": "operator_test",
    "model_deployment": "model_deployment_test",
}

SCENARIO_MAP = {
    # public v2 scenario -> internal subtype
    "operator_accuracy": "operator_accuracy",
    "operator_accuracy_performance": "operator_perf_accuracy",
    "LLM": "llm",
    "llm": "llm",
}


@dataclass(frozen=True)
class NormalizedRouting:
    internal_task_category: str
    internal_task_type: str
    internal_device_type: str
    internal_device_count: int
    image_id: Optional[int]
    tool_id: Optional[int]

    # keep for downstream
    name: str
    description: Optional[str]
    visibility: str
    priority: str
    operator_count: Optional[int]
    operator_categories: Optional[list[str]]
    operator_lib_id: Optional[int]


def normalize_unified_payload(payload: Dict[str, Any]) -> NormalizedRouting:
    """Normalize unified payload into internal fields used by EvaluationService/EvaluationTask.

    Unified payload schema (frontend -> backend):
      task, scenario, chips, chip_num, image_id, tool_id, name, ...

    Returns normalized internal fields:
      internal_task_category, internal_task_type, internal_device_type,
      internal_device_count, image_id, tool_id

    NOTE: API boundary only accepts v2 fields.
    Existing persistence layer still uses current model/service field names underneath.
    """

    task = payload.get("task")
    scenario = payload.get("scenario")
    chips = payload.get("chips")
    chip_num = payload.get("chip_num")

    if not task or not scenario or not chips:
        raise ValueError("缺少必填字段：task/scenario/chips")
    if chip_num is None:
        chip_num = 1

    if task not in TASK_MAP:
        raise ValueError(f"无效 task: {task}")

    internal_task_category = TASK_MAP[task]
    internal_task_type = SCENARIO_MAP.get(scenario, scenario)

    try:
        device_count = int(chip_num)
    except Exception:
        raise ValueError(f"chip_num 必须是整数: {chip_num}")

    image_id = payload.get("image_id")
    tool_id = payload.get("tool_id")

    # Validation by category
    if internal_task_category == "operator_test":
        if not tool_id:
            raise ValueError("算子评测必须提供 tool_id")
        # operator test does not require image
        image_id = None
    elif internal_task_category == "model_deployment_test":
        if not image_id:
            raise ValueError("模型部署评测必须提供 image_id")

    return NormalizedRouting(
        internal_task_category=internal_task_category,
        internal_task_type=internal_task_type,
        internal_device_type=chips,
        internal_device_count=device_count,
        image_id=image_id,
        tool_id=tool_id,
        name=payload.get("name") or "",
        description=payload.get("description"),
        visibility=payload.get("visibility") or "private",
        priority=payload.get("priority") or "medium",
        operator_count=payload.get("operator_count"),
        operator_categories=payload.get("operator_categories"),
        operator_lib_id=payload.get("operator_lib_id"),
    )
