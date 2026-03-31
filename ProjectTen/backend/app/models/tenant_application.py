from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class TenantApplication(Base):
    __tablename__ = "tenant_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tenant_name = Column(String(128), nullable=False)
    contact_person = Column(String(128), nullable=False)
    contact_email = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), default="pending", nullable=False)

    approved_device_type = Column(String(64), nullable=True)
    approved_device_count = Column(Integer, nullable=True)
    approved_duration_hours = Column(Integer, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
