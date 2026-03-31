from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Float,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database import Base


class TenantStatus(str, enum.Enum):
    active = "active"
    frozen = "frozen"
    cancelled = "cancelled"


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)
    type = Column(String(64), nullable=True, comment="Industry type")
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(Enum(TenantStatus), default=TenantStatus.active, nullable=False)
    compute_quota = Column(Float, default=0.0, comment="Compute quota in hours")
    storage_quota = Column(Float, default=0.0, comment="Storage quota in GB")
    max_concurrent_tasks = Column(Integer, default=5)
    device_allocation = Column(JSON, default=dict, comment="Device allocation by type: {'huawei_910c': 1}")
    device_allocation_expires_at = Column(DateTime, nullable=True, comment="Device allocation expiry time")

    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    members = relationship("User", back_populates="tenant", foreign_keys="[User.tenant_id]")
