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
    Boolean,
    Float,
    JSON,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class AssetType(str, enum.Enum):
    model = "model"
    dataset = "dataset"
    operator = "operator"
    script = "script"
    template = "template"
    toolset = "toolset"
    image = "image"  # 镜像: chip+framework+model combination


class AssetStatus(str, enum.Enum):
    active = "active"
    archived = "archived"
    deleted = "deleted"


class ShareScope(str, enum.Enum):
    personal = "personal"
    team = "team"
    platform = "platform"


class DigitalAsset(Base):
    __tablename__ = "digital_assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)

    asset_type = Column(Enum(AssetType), nullable=False)
    category = Column(String(64), nullable=True)
    tags = Column(JSON, default=list)
    asset_code = Column(String(16), nullable=True, index=True, comment="业务编号：镜像用 imageId，工具用 toolsetId")

    version = Column(String(32), default="1.0.0")
    file_path = Column(String(512), nullable=True)
    file_size = Column(Float, default=0.0, comment="Size in bytes")

    status = Column(Enum(AssetStatus), default=AssetStatus.active, nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)

    is_shared = Column(Boolean, default=False)
    share_scope = Column(Enum(ShareScope), default=ShareScope.personal, nullable=False)

    download_count = Column(Integer, default=0)
    reuse_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(64), nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
