from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_admin, write_audit_log
from app.models.tenant import Tenant, TenantStatus
from app.models.tenant_application import TenantApplication
from app.models.user import User, UserStatus, UserType
from app.schemas.tenant_application import (
    TenantApplicationApprove,
    TenantApplicationCreate,
    TenantApplicationOut,
)
from app.utils.security import hash_password

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.post("/")
def create_application(
    body: TenantApplicationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = TenantApplication(
        user_id=current_user.id,
        tenant_name=body.tenant_name,
        contact_person=body.contact_person,
        contact_email=body.contact_email,
        description=body.description,
        status="pending",
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    write_audit_log(
        db,
        user_id=current_user.id,
        action="create_tenant_application",
        resource_type="tenant_application",
        resource_id=application.id,
        details=body.model_dump(),
        ip_address=request.client.host if request.client else None,
    )
    return _ok(TenantApplicationOut.model_validate(application).model_dump())


@router.get("/")
def list_applications(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    items = db.query(TenantApplication).order_by(TenantApplication.created_at.desc()).all()
    return _ok([TenantApplicationOut.model_validate(item).model_dump() for item in items])


@router.post("/{application_id}/approve")
def approve_application(
    application_id: int,
    body: TenantApplicationApprove,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    application = db.query(TenantApplication).filter(TenantApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != "pending":
        raise HTTPException(status_code=400, detail="该申请已处理")

    applicant = db.query(User).filter(User.id == application.user_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="User not found")

    tenant_account = db.query(User).filter(User.username == application.tenant_name).first()
    if not tenant_account:
        tenant_account = User(
            username=application.tenant_name,
            email=f"{application.tenant_name}@local.test",
            phone=None,
            password_hash=hash_password("123"),
            user_type=UserType.enterprise,
            status=UserStatus.active,
            is_verified=False,
            is_2fa_enabled=False,
        )
        db.add(tenant_account)
        db.commit()
        db.refresh(tenant_account)
    else:
        tenant_account.password_hash = hash_password("123")
        tenant_account.user_type = UserType.enterprise
        tenant_account.status = UserStatus.active
        tenant_account.is_verified = False
        tenant_account.is_2fa_enabled = False
        db.add(tenant_account)
        db.commit()
        db.refresh(tenant_account)

    tenant = db.query(Tenant).filter(Tenant.name == application.tenant_name).first()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours)
    if not tenant:
        tenant = Tenant(
            name=application.tenant_name,
            type="enterprise",
            description=application.description,
            owner_id=tenant_account.id,
            status=TenantStatus.active,
            compute_quota=0.0,
            storage_quota=0.0,
            max_concurrent_tasks=5,
            device_allocation={body.device_type: body.device_count},
            device_allocation_expires_at=expires_at,
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
    else:
        alloc = tenant.device_allocation or {}
        alloc[body.device_type] = body.device_count
        tenant.owner_id = tenant_account.id
        tenant.status = TenantStatus.active
        tenant.device_allocation = alloc
        tenant.device_allocation_expires_at = expires_at
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    tenant_account.tenant_id = tenant.id
    tenant_account.user_type = UserType.enterprise
    db.add(tenant_account)

    application.status = "approved"
    application.approved_device_type = body.device_type
    application.approved_device_count = body.device_count
    application.approved_duration_hours = body.duration_hours
    application.approved_by = current_user.id
    application.approved_at = datetime.utcnow()
    db.add(application)
    db.commit()
    db.refresh(application)

    write_audit_log(
        db,
        user_id=current_user.id,
        action="approve_tenant_application",
        resource_type="tenant_application",
        resource_id=application.id,
        details=body.model_dump(),
        ip_address=request.client.host if request.client else None,
    )
    return _ok(TenantApplicationOut.model_validate(application).model_dump())
