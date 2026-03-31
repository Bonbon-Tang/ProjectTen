from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database import Base


class ModelBenchmark(Base):
    """Model deployment benchmark results.

    Each row = one image tested on one device with one evaluation method.
    """
    __tablename__ = "model_benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("digital_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    task_type = Column(String(64), nullable=False, index=True, comment="Sub-scenario: llm, multimodal, etc.")
    device_type = Column(String(64), nullable=False, index=True)
    eval_method = Column(String(64), default="standard", comment="Evaluation method name")

    # Core metrics
    throughput = Column(Float, nullable=True, comment="tokens/s or samples/s")
    throughput_unit = Column(String(32), nullable=True)
    avg_latency_ms = Column(Float, nullable=True)
    p50_latency_ms = Column(Float, nullable=True)
    p99_latency_ms = Column(Float, nullable=True)
    first_token_latency_ms = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    accuracy_metric = Column(String(32), nullable=True, comment="top1, mAP, WER, pass_rate etc.")
    energy_efficiency = Column(Float, nullable=True, comment="tokens/J or samples/J")
    energy_efficiency_unit = Column(String(32), nullable=True)
    power_consumption_w = Column(Float, nullable=True)
    performance_score = Column(Float, nullable=True)
    software_completeness_score = Column(Float, nullable=True)
    memory_usage_gb = Column(Float, nullable=True)

    # Image metadata (denormalized for display)
    image_name = Column(String(256), nullable=True)
    chip_name = Column(String(64), nullable=True)
    framework_name = Column(String(64), nullable=True)
    model_name = Column(String(128), nullable=True)

    task_id = Column(Integer, nullable=True, comment="Evaluation task that produced this")
    tested_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    image = relationship("DigitalAsset", foreign_keys=[image_id])
