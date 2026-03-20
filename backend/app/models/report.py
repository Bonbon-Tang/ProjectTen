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
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class ReportType(str, enum.Enum):
    basic = "basic"
    advanced = "advanced"
    custom = "custom"


class ReportStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class EvaluationReport(Base):
    __tablename__ = "evaluation_reports"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("evaluation_tasks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(256), nullable=False)

    report_type = Column(Enum(ReportType), default=ReportType.basic, nullable=False)
    content = Column(Text, nullable=True, comment="Report content / JSON")
    version = Column(Integer, default=1)
    status = Column(Enum(ReportStatus), default=ReportStatus.draft, nullable=False)
    file_path = Column(String(512), nullable=True, comment="Generated file path")

    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    is_public = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    task = relationship("EvaluationTask", back_populates="reports")
    creator = relationship("User", foreign_keys=[creator_id])


class UserReportArchive(Base):
    __tablename__ = "user_report_archives"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    report_id = Column(Integer, ForeignKey("evaluation_reports.id", ondelete="CASCADE"), nullable=False)
    note = Column(Text, nullable=True, comment="User note for the archive")
    archived_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    report = relationship("EvaluationReport", foreign_keys=[report_id])
