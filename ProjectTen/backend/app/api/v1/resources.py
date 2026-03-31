from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, is_tenant_user
from app.models.user import User
from app.schemas.resource import DeviceOut, DeviceStatusUpdate
from app.services.resource_service import ResourceService

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.get("/devices")
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if getattr(current_user.user_type, 'value', current_user.user_type) == 'admin':
        devices = ResourceService.list_devices(db)
    elif is_tenant_user(current_user):
        devices = ResourceService.list_devices_for_tenant(db, current_user.tenant_id)
    else:
        devices = []
    items = [DeviceOut.model_validate(d).model_dump() for d in devices]
    return _ok(items)


@router.get("/devices/{device_id}")
def get_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = ResourceService.get_device_by_id(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return _ok(DeviceOut.model_validate(device).model_dump())


@router.get("/summary")
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_type = getattr(current_user.user_type, 'value', current_user.user_type)
    summary = ResourceService.get_summary(
        db,
        tenant_id=current_user.tenant_id if is_tenant_user(current_user) else None,
        user_type='tenant' if is_tenant_user(current_user) else user_type,
    )
    return _ok(summary)


@router.put("/devices/{device_id}/status")
def update_device_status(
    device_id: int,
    body: DeviceStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = ResourceService.update_device_status(db, device_id, body.status)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return _ok(DeviceOut.model_validate(device).model_dump())


@router.get("/device-usage")
def get_device_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin sees all device usage; non-admin only sees their tenant's leased devices and tasks."""
    from app.models.resource import ComputeDevice
    from app.models.tenant import Tenant
    from app.models.evaluation import EvaluationTask, TaskStatus
    from app.models.user import User as UserModel

    user_type = getattr(current_user.user_type, 'value', current_user.user_type)
    users = {u.id: u for u in db.query(UserModel).all()}

    if user_type == 'admin':
        devices = db.query(ComputeDevice).order_by(ComputeDevice.id).all()
        tenants = db.query(Tenant).all()
        running_tasks = db.query(EvaluationTask).filter(EvaluationTask.status == TaskStatus.running).all()
    elif is_tenant_user(current_user):
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if not tenant:
            return _ok([])
        allocation = tenant.device_allocation or {}
        allowed_types = list(allocation.keys())
        if not allowed_types:
            return _ok([])
        devices = db.query(ComputeDevice).order_by(ComputeDevice.id).all()
        devices = [d for d in devices if (d.device_type.value if hasattr(d.device_type, 'value') else str(d.device_type)) in allowed_types]
        tenants = [tenant]
        running_tasks = db.query(EvaluationTask).filter(
            EvaluationTask.status == TaskStatus.running,
            EvaluationTask.tenant_id == current_user.tenant_id,
        ).all()
    else:
        return _ok([])

    usage = []
    for device in devices:
        device_key = device.device_type.value if hasattr(device.device_type, 'value') else str(device.device_type)
        leased = []
        leased_total = 0
        for tenant in tenants:
            allocation = tenant.device_allocation or {}
            count = allocation.get(device_key, 0)
            if count:
                owner = users.get(tenant.owner_id)
                leased_total += count
                leased.append({
                    "tenant_id": tenant.id,
                    "tenant_name": tenant.name,
                    "username": owner.username if owner else None,
                    "count": count,
                    "expires_at": tenant.device_allocation_expires_at.isoformat() if tenant.device_allocation_expires_at else None,
                })

        running = []
        running_total = 0
        for task in running_tasks:
            task_device = task.device_type.value if hasattr(task.device_type, 'value') else str(task.device_type)
            if task_device == device_key:
                owner = users.get(task.creator_id)
                running_total += (task.device_count or 1)
                running.append({
                    "task_id": task.id,
                    "task_name": task.name,
                    "username": owner.username if owner else None,
                    "count": task.device_count or 1,
                })

        total_count = leased_total if user_type != 'admin' else device.total_count
        available_count = max(0, leased_total - running_total) if user_type != 'admin' else device.available_count

        usage.append({
            "device_id": device.id,
            "device_name": device.name,
            "device_type": device_key,
            "total_count": total_count,
            "available_count": available_count,
            "leased_total": leased_total,
            "running_total": running_total,
            "leased": leased,
            "running": running,
        })
    return _ok(usage)
