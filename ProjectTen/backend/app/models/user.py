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
    Table,
)
from sqlalchemy.orm import relationship

from app.database import Base


class UserType(str, enum.Enum):
    personal = "personal"
    enterprise = "enterprise"
    research = "research"
    admin = "admin"


class UserStatus(str, enum.Enum):
    active = "active"
    frozen = "frozen"
    pending = "pending"


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(256), nullable=False)

    user_type = Column(Enum(UserType), default=UserType.personal, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.pending, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_2fa_enabled = Column(Boolean, default=False)

    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="members", foreign_keys=[tenant_id])
    roles = relationship("Role", secondary="user_roles", back_populates="users")
