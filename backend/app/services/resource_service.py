from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.resource import ComputeDevice, DeviceType, DeviceStatus

# Preset device configurations
PRESET_DEVICES = [
    {
        "name": "华为昇腾910C",
        "device_type": DeviceType.huawei_910c,
        "manufacturer": "华为",
        "total_count": 24,
        "available_count": 24,
        "specs": {
            "memory": "64GB HBM2e",
            "fp16_tflops": 320,
            "fp32_tflops": 160,
            "int8_tops": 640,
            "memory_bandwidth": "1.6TB/s",
            "tdp": "310W",
            "interconnect": "HCCS 56GB/s",
            "architecture": "Da Vinci 2.0",
        },
        "status": DeviceStatus.online,
    },
    {
        "name": "华为昇腾910B",
        "device_type": DeviceType.huawei_910b,
        "manufacturer": "华为",
        "total_count": 24,
        "available_count": 24,
        "specs": {
            "memory": "64GB HBM2e",
            "fp16_tflops": 256,
            "fp32_tflops": 128,
            "int8_tops": 512,
            "memory_bandwidth": "1.4TB/s",
            "tdp": "310W",
            "interconnect": "HCCS 56GB/s",
            "architecture": "Da Vinci",
        },
        "status": DeviceStatus.online,
    },
    {
        "name": "寒武纪MLU590",
        "device_type": DeviceType.cambrian_590,
        "manufacturer": "寒武纪",
        "total_count": 24,
        "available_count": 24,
        "specs": {
            "memory": "48GB HBM2",
            "fp16_tflops": 256,
            "fp32_tflops": 128,
            "int8_tops": 512,
            "memory_bandwidth": "1.2TB/s",
            "tdp": "300W",
            "interconnect": "MLU-Link 192GB/s",
            "architecture": "MLUarch03",
        },
        "status": DeviceStatus.online,
    },
    {
        "name": "昆仑芯P800",
        "device_type": DeviceType.kunlun_p800,
        "manufacturer": "昆仑芯",
        "total_count": 12,
        "available_count": 12,
        "specs": {
            "memory": "64GB HBM2e",
            "fp16_tflops": 256,
            "fp32_tflops": 128,
            "int8_tops": 512,
            "memory_bandwidth": "1.2TB/s",
            "tdp": "250W",
            "interconnect": "KLCL 128GB/s",
            "architecture": "XPU-R",
        },
        "status": DeviceStatus.online,
    },
    {
        "name": "海光DCU BW1000",
        "device_type": DeviceType.hygon_bw1000,
        "manufacturer": "海光",
        "total_count": 8,
        "available_count": 8,
        "specs": {
            "memory": "32GB HBM2e",
            "fp16_tflops": 192,
            "fp32_tflops": 96,
            "int8_tops": 384,
            "memory_bandwidth": "1.0TB/s",
            "tdp": "280W",
            "interconnect": "HyperTransport 128GB/s",
            "architecture": "DCU Gen1",
        },
        "status": DeviceStatus.online,
    },
]


class ResourceService:

    @staticmethod
    def init_preset_devices(db: Session) -> None:
        """Initialize preset compute devices if the table is empty."""
        count = db.query(ComputeDevice).count()
        if count > 0:
            return
        for device_data in PRESET_DEVICES:
            device = ComputeDevice(**device_data)
            db.add(device)
        db.commit()

    @staticmethod
    def list_devices(db: Session) -> List[ComputeDevice]:
        return db.query(ComputeDevice).order_by(ComputeDevice.id).all()

    @staticmethod
    def get_device_by_id(db: Session, device_id: int) -> Optional[ComputeDevice]:
        return db.query(ComputeDevice).filter(ComputeDevice.id == device_id).first()

    @staticmethod
    def get_summary(db: Session) -> dict:
        devices = db.query(ComputeDevice).all()
        total_devices = sum(d.total_count for d in devices)
        available_devices = sum(d.available_count for d in devices)
        by_type = []
        for d in devices:
            by_type.append({
                "device_type": d.device_type.value,
                "name": d.name,
                "manufacturer": d.manufacturer,
                "total_count": d.total_count,
                "available_count": d.available_count,
                "status": d.status.value,
            })
        return {
            "total_device_types": len(devices),
            "total_devices": total_devices,
            "available_devices": available_devices,
            "utilization_rate": round((total_devices - available_devices) / total_devices * 100, 1) if total_devices > 0 else 0,
            "devices_by_type": by_type,
        }

    @staticmethod
    def update_device_status(db: Session, device_id: int, new_status: str) -> Optional[ComputeDevice]:
        device = db.query(ComputeDevice).filter(ComputeDevice.id == device_id).first()
        if not device:
            return None
        device.status = DeviceStatus(new_status)
        db.commit()
        db.refresh(device)
        return device
