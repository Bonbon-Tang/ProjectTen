from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class OperatorOut(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str] = None
    h100_fp32_latency: Optional[float] = None
    h100_fp16_latency: Optional[float] = None
    h100_int8_latency: Optional[float] = None
    h100_throughput: Optional[float] = None
    h100_memory_mb: Optional[float] = None
    input_shape: Optional[str] = None
    # Tested results
    tested_device_type: Optional[str] = None
    tested_fp32_latency: Optional[float] = None
    tested_fp16_latency: Optional[float] = None
    tested_int8_latency: Optional[float] = None
    tested_throughput: Optional[float] = None
    tested_accuracy_fp32: Optional[float] = None
    tested_accuracy_fp16: Optional[float] = None
    tested_accuracy_int8: Optional[float] = None
    tested_operator_lib: Optional[str] = None
    tested_task_id: Optional[int] = None
    tested_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class OperatorListResponse(BaseModel):
    items: List[OperatorOut]
    total: int
    page: int
    page_size: int


class OperatorCategoryOut(BaseModel):
    category: str
    count: int


class BenchmarkSummary(BaseModel):
    total_operators: int
    total_categories: int
    avg_fp32_latency: Optional[float] = None
    avg_fp16_latency: Optional[float] = None
    avg_int8_latency: Optional[float] = None
    avg_throughput: Optional[float] = None
    avg_memory_mb: Optional[float] = None
    categories: List[OperatorCategoryOut]
