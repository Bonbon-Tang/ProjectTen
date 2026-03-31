from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class TaskRun(Base):
    __tablename__ = "task_runs"

    id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String(32), nullable=False, index=True)  # evaluation | adaptation
    task_id = Column(Integer, nullable=False, index=True)
    run_no = Column(Integer, default=1, nullable=False)
    status = Column(String(32), default="pending", nullable=False)
    stage = Column(String(64), nullable=True)
    executor = Column(String(64), default="simulator", nullable=False)
    resource_snapshot = Column(JSON, nullable=True)
    result_snapshot = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TaskLog(Base):
    __tablename__ = "task_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_run_id = Column(Integer, ForeignKey("task_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    task_type = Column(String(32), nullable=False, index=True)
    task_id = Column(Integer, nullable=False, index=True)
    stage = Column(String(64), nullable=True)
    level = Column(String(16), default="INFO", nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    run = relationship("TaskRun")


class AdaptationAction(Base):
    __tablename__ = "adaptation_actions"

    id = Column(Integer, primary_key=True, index=True)
    adaptation_id = Column(Integer, ForeignKey("adaptation_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    step_no = Column(Integer, nullable=False)
    action_type = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    before_value = Column(JSON, nullable=True)
    after_value = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    status = Column(String(32), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
