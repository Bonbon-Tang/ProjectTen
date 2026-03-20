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
    JSON,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class TaskCategory(str, enum.Enum):
    operator_test = "operator_test"
    model_test = "model_test"


class TaskType(str, enum.Enum):
    # Legacy types (kept for backward compatibility)
    chip = "chip"
    model = "model"
    framework = "framework"
    middleware = "middleware"
    operator = "operator"
    scene = "scene"
    # Operator test subtypes
    accuracy_only = "accuracy_only"
    accuracy_and_performance = "accuracy_and_performance"
    # Legacy operator subtypes (kept for backward compatibility)
    accuracy_verification = "accuracy_verification"
    performance_benchmark = "performance_benchmark"
    # Model test subtypes (25 sub-scenarios)
    llm = "llm"
    multimodal = "multimodal"
    speech_recognition = "speech_recognition"
    image_classification = "image_classification"
    object_detection = "object_detection"
    semantic_segmentation = "semantic_segmentation"
    text_generation = "text_generation"
    machine_translation = "machine_translation"
    sentiment_analysis = "sentiment_analysis"
    question_answering = "question_answering"
    text_summarization = "text_summarization"
    speech_synthesis = "speech_synthesis"
    image_generation = "image_generation"
    video_understanding = "video_understanding"
    ocr = "ocr"
    recommendation = "recommendation"
    anomaly_detection = "anomaly_detection"
    time_series = "time_series"
    reinforcement_learning = "reinforcement_learning"
    graph_neural_network = "graph_neural_network"
    medical_imaging = "medical_imaging"
    autonomous_driving = "autonomous_driving"
    robot_control = "robot_control"
    code_generation = "code_generation"
    knowledge_graph = "knowledge_graph"


class CreateMode(str, enum.Enum):
    template = "template"
    custom = "custom"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    terminated = "terminated"


class Priority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class EvaluationTask(Base):
    __tablename__ = "evaluation_tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)

    task_category = Column(Enum(TaskCategory), nullable=True, comment="operator_test or model_test")
    task_type = Column(Enum(TaskType), nullable=False)
    create_mode = Column(Enum(CreateMode), default=CreateMode.template, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.pending, nullable=False)
    priority = Column(Enum(Priority), default=Priority.medium, nullable=False)
    progress = Column(Integer, default=0, comment="Task progress 0-100")

    device_type = Column(String(64), nullable=True, comment="Device type for execution")
    device_count = Column(Integer, default=1, comment="Number of devices to use")
    toolset_id = Column(Integer, ForeignKey("digital_assets.id", ondelete="SET NULL"), nullable=True,
                        comment="Associated toolset asset")

    # Operator test parameters
    operator_count = Column(Integer, nullable=True, comment="Number of operators to test (None = all matching)")
    operator_categories = Column(JSON, nullable=True, comment="List of operator categories to test (None = all)")
    operator_lib_id = Column(Integer, ForeignKey("digital_assets.id", ondelete="SET NULL"), nullable=True,
                             comment="Operator library asset (e.g. FlagGems, DIOPI)")

    config = Column(JSON, default=dict, comment="Evaluation parameter configuration")
    result = Column(JSON, nullable=True, comment="Evaluation result")
    resource_spec = Column(JSON, nullable=True, comment="Hardware resource spec")
    metrics = Column(JSON, nullable=True, comment="Evaluation metrics (TGS, latency, accuracy, etc.)")

    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)

    is_custom_billing = Column(Boolean, default=False, comment="Custom evaluation, needs billing")
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id])
    tenant = relationship("Tenant", foreign_keys=[tenant_id])
    reports = relationship("EvaluationReport", back_populates="task", cascade="all, delete-orphan", passive_deletes=True)
    toolset = relationship("DigitalAsset", foreign_keys=[toolset_id])
