from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class TenantApplicationCreate(BaseModel):
    tenant_name: str
    contact_person: str
    contact_email: EmailStr
    description: Optional[str] = None


class TenantApplicationApprove(BaseModel):
    device_type: str
    device_count: int
    duration_hours: int


class TenantApplicationOut(BaseModel):
    id: int
    user_id: int
    tenant_name: str
    contact_person: str
    contact_email: str
    description: Optional[str] = None
    status: str
    approved_device_type: Optional[str] = None
    approved_device_count: Optional[int] = None
    approved_duration_hours: Optional[int] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
