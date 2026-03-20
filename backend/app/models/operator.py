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
from sqlalchemy.sql import func

from app.database import Base


class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, comment="Operator name, e.g. Conv2d, BatchNorm, ReLU")
    category = Column(String(50), nullable=False, comment="Category: convolution, normalization, activation, etc.")
    description = Column(String(500), nullable=True)

    # H100 Benchmark baseline data
    h100_fp32_latency = Column(Float, nullable=True, comment="FP32 latency (us)")
    h100_fp16_latency = Column(Float, nullable=True, comment="FP16 latency (us)")
    h100_int8_latency = Column(Float, nullable=True, comment="INT8 latency (us)")
    h100_throughput = Column(Float, nullable=True, comment="Throughput (GOPS)")
    h100_memory_mb = Column(Float, nullable=True, comment="Memory usage (MB)")
    input_shape = Column(String(200), nullable=True, comment="Default test input shape")

    # Tested results from evaluation (written back after test completes)
    tested_device_type = Column(String(64), nullable=True, comment="Last tested device type")
    tested_fp32_latency = Column(Float, nullable=True, comment="Tested FP32 latency on device (us)")
    tested_fp16_latency = Column(Float, nullable=True, comment="Tested FP16 latency on device (us)")
    tested_int8_latency = Column(Float, nullable=True, comment="Tested INT8 latency on device (us)")
    tested_throughput = Column(Float, nullable=True, comment="Tested throughput on device (GOPS)")
    tested_accuracy_fp32 = Column(Float, nullable=True, comment="Tested FP32 accuracy")
    tested_accuracy_fp16 = Column(Float, nullable=True, comment="Tested FP16 accuracy")
    tested_accuracy_int8 = Column(Float, nullable=True, comment="Tested INT8 accuracy")
    tested_operator_lib = Column(String(200), nullable=True, comment="Source operator library name")
    tested_task_id = Column(Integer, nullable=True, comment="Evaluation task ID that produced these results")
    tested_at = Column(DateTime, nullable=True, comment="When the test was performed")

    created_at = Column(DateTime, default=datetime.utcnow)
