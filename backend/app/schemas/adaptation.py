from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class AdaptationCreate(BaseModel):
    name: str
    image_id: int
    device_type: str
    device_count: int = 1
    test_mode: str = "standard"
    precision: str = "bf16"
    save_image: bool = True
    saved_image_name: Optional[str] = None
    save_notes: Optional[str] = None
    config: Dict[str, Any] = {}


class AdaptationOut(BaseModel):
    id: int
    name: str
    image_id: Optional[int] = None
    creator_id: Optional[int] = None
    tenant_id: Optional[int] = None
    device_type: str
    device_count: int
    test_mode: str
    precision: str
    save_image: bool
    saved_image_name: Optional[str] = None
    save_notes: Optional[str] = None
    status: str
    tags: list[str] = []
    config: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    image_name: Optional[str] = None

    model_config = {"from_attributes": True}
