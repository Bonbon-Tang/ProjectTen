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


TEST_TAGS = {
    "operator_test.operator_accuracy": "算子精度测试",
    "operator_test.operator_perf_accuracy": "算子精度+性能测试",
    "operator_test.performance_benchmark": "算子性能基准测试",
    "model_deployment_test.llm": "大语言模型测试",
    "model_deployment_test.multimodal": "多模态模型测试",
    "model_deployment_test.speech_recognition": "语音识别测试",
    "model_deployment_test.image_classification": "图像分类测试",
    "model_deployment_test.object_detection": "目标检测测试",
    "model_deployment_test.semantic_segmentation": "语义分割测试",
    "model_deployment_test.text_generation": "文本生成测试",
    "model_deployment_test.machine_translation": "机器翻译测试",
    "model_deployment_test.sentiment_analysis": "情感分析测试",
    "model_deployment_test.question_answering": "问答测试",
    "model_deployment_test.text_summarization": "文本摘要测试",
    "model_deployment_test.speech_synthesis": "语音合成测试",
    "model_deployment_test.image_generation": "图像生成测试",
    "model_deployment_test.video_understanding": "视频理解测试",
    "model_deployment_test.ocr": "OCR测试",
    "model_deployment_test.recommendation": "推荐系统测试",
    "model_deployment_test.anomaly_detection": "异常检测测试",
    "model_deployment_test.time_series": "时间序列测试",
    "model_deployment_test.reinforcement_learning": "强化学习测试",
    "model_deployment_test.graph_neural_network": "图神经网络测试",
    "model_deployment_test.medical_imaging": "医疗影像测试",
    "model_deployment_test.autonomous_driving": "自动驾驶测试",
    "model_deployment_test.robot_control": "机器人控制测试",
    "model_deployment_test.code_generation": "代码生成测试",
    "model_deployment_test.knowledge_graph": "知识图谱测试",
}

TAG_TO_CATEGORY_TYPE = {
    tag: tuple(tag.split('.', 1)) for tag in TEST_TAGS.keys()
}


def build_primary_tag(task_category: str | None, task_type: str | None) -> str | None:
    if not task_category or not task_type:
        return None
    return f"{task_category}.{task_type}"


class TaskCategory(str, enum.Enum):
    operator_test = "operator_test"
    model_deployment_test = "model_deployment_test"


class TaskType(str, enum.Enum):
    # Legacy types (kept for backward compatibility)
    chip = "chip"
    model = "model"
    framework = "framework"
    middleware = "middleware"
    operator = "operator"
    scene = "scene"
    # Operator test subtypes
    operator_accuracy = "operator_accuracy"
    operator_perf_accuracy = "operator_perf_accuracy"
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

    tags = Column(JSON, nullable=True, default=list, comment="Unified tag list")
    primary_tag = Column(String(128), nullable=True, index=True, comment="Primary execution tag")

    task_category = Column(Enum(TaskCategory), nullable=True, comment="operator_test or model_deployment_test")
    task_type = Column(Enum(TaskType), nullable=False)
    create_mode = Column(Enum(CreateMode), default=CreateMode.template, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.pending, nullable=False)
    priority = Column(Enum(Priority), default=Priority.medium, nullable=False)
    progress = Column(Integer, default=0, comment="Task progress 0-100")

    device_type = Column(String(64), nullable=True, comment="Device type for execution")
    device_count = Column(Integer, default=1, comment="Number of devices to use")
    visibility = Column(String(32), default="private", nullable=False, comment="private or platform")
    toolset_id = Column(Integer, ForeignKey("digital_assets.id", ondelete="SET NULL"), nullable=True,
                        comment="Associated toolset asset")

    # Operator test parameters
    operator_count = Column(Integer, nullable=True, comment="Number of operators to test (None = all matching)")
    operator_categories = Column(JSON, nullable=True, comment="List of operator categories to test (None = all)")
    operator_lib_id = Column(Integer, ForeignKey("digital_assets.id", ondelete="SET NULL"), nullable=True,
                             comment="Operator library asset (e.g. FlagGems, DIOPI)")
    image_id = Column(Integer, ForeignKey("digital_assets.id", ondelete="SET NULL"), nullable=True,
                      comment="Model deployment image (chip+framework+model)")

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
