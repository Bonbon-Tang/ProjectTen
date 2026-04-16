from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Integer,
    String,
    JSON,
    ForeignKey,
)

from app.database import Base


class DeviceType(str, enum.Enum):
    nvidia_h200 = "nvidia_h200"
    huawei_910c = "huawei_910c"
    huawei_910b = "huawei_910b"
    cambrian_590 = "cambrian_590"
    kunlun_p800 = "kunlun_p800"
    hygon_bw1000 = "hygon_bw1000"
    cpu_test = "cpu_test"


class DeviceStatus(str, enum.Enum):
    online = "online"
    busy = "busy"
    offline = "offline"
    maintenance = "maintenance"


class ComputeDevice(Base):
    __tablename__ = "compute_devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    device_type = Column(Enum(DeviceType), nullable=False)
    manufacturer = Column(String(128), nullable=False)
    total_count = Column(Integer, nullable=False, default=0)
    available_count = Column(Integer, nullable=False, default=0)
    specs = Column(JSON, default=dict, comment="Device specifications (memory, compute power, etc.)")
    status = Column(Enum(DeviceStatus), default=DeviceStatus.online, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, comment="Owner tenant (NULL = shared/global)")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
