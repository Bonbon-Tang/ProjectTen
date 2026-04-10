from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


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
