from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class OperatorBenchmark(Base):
    """Per-operator per-device per-shape benchmark results.

    Each row represents the test result of one operator on a specific
    device type with a specific input shape.
    """
    __tablename__ = "operator_benchmarks"
    __table_args__ = (
        UniqueConstraint("operator_id", "device_type", "input_shape", name="uq_op_device_shape"),
    )

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    device_type = Column(String(64), nullable=False, index=True, comment="e.g. huawei_910c")
    input_shape = Column(String(200), nullable=False, comment="e.g. [1,64,112,112]")

    # Accuracy
    fp32_accuracy = Column(Float, nullable=True)
    fp16_accuracy = Column(Float, nullable=True)
    int8_accuracy = Column(Float, nullable=True)
    fp16_loss_rate = Column(Float, nullable=True, comment="FP16 vs FP32 loss %")
    int8_loss_rate = Column(Float, nullable=True, comment="INT8 vs FP32 loss %")
    accuracy_pass = Column(Integer, default=0, comment="1=pass, 0=fail")

    # Performance (latency in microseconds)
    fp32_latency = Column(Float, nullable=True)
    fp16_latency = Column(Float, nullable=True)
    int8_latency = Column(Float, nullable=True)
    throughput = Column(Float, nullable=True, comment="GOPS")

    # Metadata
    operator_lib = Column(String(200), nullable=True, comment="Source operator library name")
    task_id = Column(Integer, nullable=True, comment="Evaluation task that produced this result")
    tested_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    operator = relationship("Operator", foreign_keys=[operator_id])
