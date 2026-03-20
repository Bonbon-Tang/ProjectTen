from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TenantCreate(BaseModel):
    name: str
    type: Optional[str] = None
    description: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class TenantQuotaUpdate(BaseModel):
    compute_quota: Optional[float] = None
    storage_quota: Optional[float] = None
    max_concurrent_tasks: Optional[int] = None


class TenantMemberAdd(BaseModel):
    user_id: int


class TenantOut(BaseModel):
    id: int
    name: str
    type: Optional[str] = None
    description: Optional[str] = None
    owner_id: int
    status: str
    compute_quota: float
    storage_quota: float
    max_concurrent_tasks: int
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
