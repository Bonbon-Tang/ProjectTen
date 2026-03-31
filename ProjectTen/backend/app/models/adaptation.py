from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class AdaptationTask(Base):
    __tablename__ = "adaptation_tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    image_id = Column(Integer, ForeignKey("digital_assets.id", ondelete="SET NULL"), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)

    device_type = Column(String(64), nullable=False)
    device_count = Column(Integer, default=1, nullable=False)
    test_mode = Column(String(32), default="standard", nullable=False)
    precision = Column(String(32), default="bf16", nullable=False)
    save_image = Column(Boolean, default=True, nullable=False)
    saved_image_name = Column(String(255), nullable=True)
    save_notes = Column(Text, nullable=True)
    status = Column(String(32), default="pending", nullable=False)
    tags = Column(JSON, default=list)
    config = Column(JSON, default=dict)
    result = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", foreign_keys=[creator_id])
    image = relationship("DigitalAsset", foreign_keys=[image_id])
