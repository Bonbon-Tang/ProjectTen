from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Boolean,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), nullable=False)
    description = Column(String(256), nullable=True)
    is_system = Column(Boolean, default=False, comment="System preset role")
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True,
                       comment="NULL = global role")
    permissions = Column(JSON, default=list, comment="List of permission strings")

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    users = relationship("User", secondary="user_roles", back_populates="roles")
