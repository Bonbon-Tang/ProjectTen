from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ReportGenerate(BaseModel):
    title: str
    report_type: str = "basic"  # basic | advanced | custom


class ReportShare(BaseModel):
    is_public: bool = True


class ReportCompareRequest(BaseModel):
    report_ids: List[int]


class ReportOut(BaseModel):
    id: int
    task_id: int
    title: str
    report_type: str
    content: Optional[str] = None
    version: int
    status: str
    file_path: Optional[str] = None
    creator_id: int
    tenant_id: Optional[int] = None
    is_public: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ArchiveCreate(BaseModel):
    note: Optional[str] = None


class ArchiveOut(BaseModel):
    id: int
    user_id: int
    report_id: int
    note: Optional[str] = None
    archived_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
