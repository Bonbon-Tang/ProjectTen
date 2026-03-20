from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DeviceOut(BaseModel):
    id: int
    name: str
    device_type: str
    manufacturer: str
    total_count: int
    available_count: int
    specs: Dict[str, Any] = {}
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DeviceStatusUpdate(BaseModel):
    status: str  # online | offline | maintenance


class ResourceSummary(BaseModel):
    total_device_types: int
    total_devices: int
    available_devices: int
    utilization_rate: float
    devices_by_type: List[Dict[str, Any]]
