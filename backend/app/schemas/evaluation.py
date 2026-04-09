from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class EvaluationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    primary_tag: Optional[str] = None
    task_category: Optional[str] = None  # operator_test | model_deployment_test
    task_type: Optional[str] = None  # operator subtypes or deployment scenario subtypes
    image_code: Optional[str] = None
    toolset_code: Optional[str] = None
    create_mode: str = "template"
    priority: str = "medium"
    visibility: str = "private"
    config: Dict[str, Any] = {}
    resource_spec: Optional[Dict[str, Any]] = None
    is_custom_billing: bool = False
    max_retries: int = 3
    device_type: Optional[str] = None
    device_count: Optional[int] = 1
    toolset_id: Optional[int] = None
    operator_count: Optional[int] = None  # Number of operators to test (None = all matching)
    operator_categories: Optional[List[str]] = None  # Operator categories to test (None = all)
    operator_lib_id: Optional[int] = None  # Operator library asset ID
    image_id: Optional[int] = None  # Model deployment image ID
    image_name: Optional[str] = None  # Denormalized image name for display


class EvaluationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class EvaluationOut(BaseModel):
    id: int
    name: str
    image_code: Optional[str] = None
    toolset_code: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    primary_tag: Optional[str] = None
    task_category: Optional[str] = None
    task_type: str
    create_mode: str
    status: str
    priority: str
    progress: int = 0
    device_type: Optional[str] = None
    device_count: int = 1
    visibility: str = "private"
    toolset_id: Optional[int] = None
    operator_count: Optional[int] = None
    operator_categories: Optional[List[str]] = None
    operator_lib_id: Optional[int] = None
    image_id: Optional[int] = None
    config: Dict[str, Any] = {}
    result: Optional[Dict[str, Any]] = None
    resource_spec: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    creator_id: int
    tenant_id: Optional[int] = None
    is_custom_billing: bool
    retry_count: int
    max_retries: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
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
