from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class AssetUpload(BaseModel):
    name: str
    description: Optional[str] = None
    asset_type: str  # model | dataset | operator | script | template | toolset
    category: Optional[str] = None
    tags: List[str] = []
    version: str = "1.0.0"
    file_path: Optional[str] = None
    file_size: float = 0.0


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    version: Optional[str] = None


class AssetShare(BaseModel):
    is_shared: bool = True
    share_scope: str = "team"  # personal | team | platform


class AssetOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    asset_type: str
    category: Optional[str] = None
    tags: List[str] = []
    asset_code: Optional[str] = None
    version: str
    file_path: Optional[str] = None
    file_size: float
    status: str
    creator_id: Optional[int] = None
    tenant_id: Optional[int] = None
    is_shared: bool
    share_scope: str
    download_count: int
    reuse_count: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
