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
    {
        "name": "本机 CPU 测试节点",
        "device_type": DeviceType.cpu_test,
        "manufacturer": "本机容器节点",
        "total_count": 1,
        "available_count": 1,
        "specs": {
            "memory": "轻量容器共享内存",
            "fp16_tflops": 0,
            "fp32_tflops": 0,
            "int8_tops": 0,
            "memory_bandwidth": "N/A",
            "tdp": "N/A",
            "interconnect": "local process",
            "architecture": "CPU test runner",
        },
        "status": DeviceStatus.online,
    },
]


class ResourceService:

    @staticmethod
    def init_preset_devices(db: Session) -> None:
        """Initialize preset compute devices and backfill newly added presets."""
        existing_types = {
            d.device_type.value if hasattr(d.device_type, 'value') else str(d.device_type)
            for d in db.query(ComputeDevice).all()
        }
        changed = False
        for device_data in PRESET_DEVICES:
            device_type = device_data['device_type'].value if hasattr(device_data['device_type'], 'value') else str(device_data['device_type'])
            if device_type in existing_types:
                continue
            db.add(ComputeDevice(**device_data))
            changed = True
        if changed:
            db.commit()

    @staticmethod
    def list_devices(db: Session, tenant_id: Optional[int] = None) -> List[ComputeDevice]:
        """List compute devices. If tenant_id is provided, filter by tenant (for non-admin users)."""
        q = db.query(ComputeDevice)
        if tenant_id is not None:
            q = q.filter(
                (ComputeDevice.tenant_id == tenant_id) | (ComputeDevice.tenant_id == None)
            )
        return q.order_by(ComputeDevice.id).all()

    @staticmethod
    @staticmethod
    def list_devices_for_tenant(db: Session, tenant_id: int, check_expiry: bool = True) -> List[ComputeDevice]:
        """List devices for a non-admin tenant.
        
        Available count = allocated count - devices in use by tenant's running tasks.
        Admin's device pool is not affected by tenant's task usage.
        """
        from app.models.tenant import Tenant
        from app.models.evaluation import EvaluationTask, TaskStatus
        from app.models.user import User
        
        # Get tenant's device allocation
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return []
        
        # Check if device allocation has expired
        if check_expiry and tenant.device_allocation_expires_at:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            expires_at = tenant.device_allocation_expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if now > expires_at:
                return []
        
        allocation = tenant.device_allocation or {}
        if not allocation:
            return []
        
        # Count devices in use by tenant's running tasks
        devices_in_use = {}
        tenant_user_ids = [u[0] for u in db.query(User.id).filter(User.tenant_id == tenant_id).all()]
        
        if tenant_user_ids:
            running_tasks = db.query(EvaluationTask).filter(
                EvaluationTask.creator_id.in_(tenant_user_ids),
                EvaluationTask.status == TaskStatus.running,
                EvaluationTask.device_type.isnot(None)
            ).all()
            
            for task in running_tasks:
                device_type = task.device_type.value if hasattr(task.device_type, 'value') else str(task.device_type)
                devices_in_use[device_type] = devices_in_use.get(device_type, 0) + (task.device_count or 1)
        
        # Get all global devices
        global_devices = db.query(ComputeDevice).filter(
            (ComputeDevice.tenant_id == None) | (ComputeDevice.tenant_id == 1)
        ).all()
        
        # Build result
        result = []
        for device in global_devices:
            device_type = device.device_type.value
            if device_type in allocation:
                allocated_count = allocation[device_type]
                in_use_count = devices_in_use.get(device_type, 0)
                available_count = max(0, allocated_count - in_use_count)
                
                device.name = device.name
                device.total_count = allocated_count
                device.available_count = available_count
                result.append(device)
        
        return result

    def get_device_by_id(db: Session, device_id: int) -> Optional[ComputeDevice]:
        return db.query(ComputeDevice).filter(ComputeDevice.id == device_id).first()

    @staticmethod
    def get_summary(db: Session, tenant_id: Optional[int] = None, user_type: Optional[str] = None) -> dict:
        """Get resource summary.
        
        - Admin: sees global pool after subtracting leased devices
        - Non-admin: sees allocated devices (using list_devices_for_tenant)
        """
        from app.models.tenant import Tenant
        from datetime import datetime, timezone

        if user_type != "admin" and tenant_id is not None:
            devices = ResourceService.list_devices_for_tenant(db, tenant_id, check_expiry=True)
        else:
            devices = db.query(ComputeDevice).all()
            active_allocations = {}
            now = datetime.now(timezone.utc)
            tenants = db.query(Tenant).all()

            for tenant in tenants:
                expires_at = tenant.device_allocation_expires_at
                if expires_at:
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)
                    if now > expires_at:
                        continue
                allocation = tenant.device_allocation or {}
                for device_type, count in allocation.items():
                    active_allocations[device_type] = active_allocations.get(device_type, 0) + count

            adjusted_devices = []
            for device in devices:
                device_type = device.device_type.value if hasattr(device.device_type, 'value') else str(device.device_type)
                leased_count = active_allocations.get(device_type, 0)
                available_count = max(0, device.total_count - leased_count)
                device.available_count = min(device.available_count, available_count)
                adjusted_devices.append(device)
            devices = adjusted_devices
        
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
