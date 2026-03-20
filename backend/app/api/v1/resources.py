from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
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
    devices = ResourceService.list_devices(db)
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
    summary = ResourceService.get_summary(db)
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
