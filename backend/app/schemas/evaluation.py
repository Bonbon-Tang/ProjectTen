from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, model_validator


class EvaluationCreate(BaseModel):
    """Unified routing payload (v2).

    Frontend MUST send ONLY these normalized fields.
    Backend will persist normalized fields into EvaluationTask.
    """

    # Meta
    name: str
    description: Optional[str] = None
    visibility: str = "private"
    priority: str = "medium"

    # Unified routing core
    task: str  # operator | model_deployment
    scenario: str  # operator_accuracy | operator_accuracy_performance | llm | ...
    chips: str  # chip tag, e.g. huawei_910c
    chip_num: int = 1
    image_id: Optional[int] = None
    tool_id: Optional[int] = None

    # Operator-only options
    operator_count: Optional[int] = None
    operator_categories: Optional[List[str]] = None
    operator_lib_id: Optional[int] = None


class EvaluationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class EvaluationOut(BaseModel):
    """Unified response payload (v2).

    For UI display we still keep additional metadata fields, but routing core is normalized.
    """

    id: int
    name: str
    description: Optional[str] = None

    # unified routing core
    task: str
    scenario: str
    chips: str
    chip_num: int
    image_id: Optional[int] = None
    tool_id: Optional[int] = None

    # meta/status
    status: str
    priority: str
    progress: int = 0
    visibility: str = "private"

    # operator-only
    operator_count: Optional[int] = None
    operator_categories: Optional[List[str]] = None
    operator_lib_id: Optional[int] = None

    # timestamps/owner
    creator_id: int
    tenant_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def normalize_from_task(cls, data):
        if isinstance(data, dict):
            task_type = data.get("task_type")
            task_category = data.get("task_category")
            if task_type is not None and "scenario" not in data:
                data["scenario"] = task_type.value if hasattr(task_type, "value") else str(task_type)
            if task_category is not None and "task" not in data:
                task_category_val = task_category.value if hasattr(task_category, "value") else str(task_category)
                data["task"] = "model_deployment" if task_category_val == "model_deployment_test" else "operator"
            if "chips" not in data:
                data["chips"] = data.get("device_type") or data.get("chips") or ""
            if "chip_num" not in data:
                data["chip_num"] = data.get("device_count") or 1
            if "tool_id" not in data:
                data["tool_id"] = data.get("toolset_id")
            if "image_id" not in data:
                data["image_id"] = data.get("image_id")
        else:
            task_type = getattr(data, "task_type", None)
            task_category = getattr(data, "task_category", None)
            if task_type is not None and not getattr(data, "scenario", None):
                setattr(data, "scenario", task_type.value if hasattr(task_type, "value") else str(task_type))
            if task_category is not None and not getattr(data, "task", None):
                task_category_val = task_category.value if hasattr(task_category, "value") else str(task_category)
                setattr(data, "task", "model_deployment" if task_category_val == "model_deployment_test" else "operator")
            if not getattr(data, "chips", None):
                setattr(data, "chips", getattr(data, "device_type", "") or "")
            if not getattr(data, "chip_num", None):
                setattr(data, "chip_num", getattr(data, "device_count", 1) or 1)
            if not getattr(data, "tool_id", None):
                setattr(data, "tool_id", getattr(data, "toolset_id", None))
        return data


class BatchDeleteRequest(BaseModel):
    task_ids: List[int]


class BatchDeleteResponse(BaseModel):
    deleted: int
    skipped: int
    skipped_ids: List[int] = []
    message: str


class EvaluationStatsOut(BaseModel):
    total: int = 0
    running: int = 0
    queued: int = 0
    pending: int = 0
    completed: int = 0
    failed: int = 0
    terminated: int = 0
