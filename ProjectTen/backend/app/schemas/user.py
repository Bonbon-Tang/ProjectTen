from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    user_type: str = "personal"  # personal | enterprise | research | admin


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_2fa_enabled: Optional[bool] = None


class UserStatusUpdate(BaseModel):
    status: str  # active | frozen | pending


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    phone: Optional[str] = None
    user_type: str
    status: str
    is_verified: bool
    is_2fa_enabled: bool
    tenant_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: int
    username: str
    email: str
    user_type: str
    status: str

    model_config = {"from_attributes": True}
