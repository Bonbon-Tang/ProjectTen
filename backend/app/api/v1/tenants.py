from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_permissions, write_audit_log
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantMemberAdd, TenantOut, TenantQuotaUpdate, TenantUpdate
from app.services.tenant_service import TenantService
from app.utils.pagination import PaginationParams, paginate

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.post("/")
@router.post("")
def create_tenant(body: TenantCreate, request: Request,
                  current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    try:
        tenant = TenantService.create(db, name=body.name, owner_id=current_user.id,
                                      type=body.type, description=body.description)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=current_user.id, action="create_tenant", resource_type="tenant",
                    resource_id=tenant.id, ip_address=request.client.host if request.client else None)
    return _ok(TenantOut.model_validate(tenant).model_dump())


@router.get("/")
@router.get("")
def list_tenants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_permissions("tenants:read")),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page, page_size)
    tenants, total = TenantService.list_tenants(db, pagination)
    items = [TenantOut.model_validate(t).model_dump() for t in tenants]
    return _ok(paginate(items, total, page, page_size))


@router.get("/{tenant_id}")
def get_tenant(tenant_id: int,
               current_user: User = Depends(require_permissions("tenants:read")),
               db: Session = Depends(get_db)):
    tenant = TenantService.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return _ok(TenantOut.model_validate(tenant).model_dump())


@router.put("/{tenant_id}")
def update_tenant(tenant_id: int, body: TenantUpdate, request: Request,
                  current_user: User = Depends(require_permissions("tenants:write")),
                  db: Session = Depends(get_db)):
    tenant = TenantService.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    updates = body.model_dump(exclude_unset=True)
    tenant = TenantService.update(db, tenant, **updates)

    write_audit_log(db, user_id=current_user.id, action="update_tenant", resource_type="tenant",
                    resource_id=tenant_id, details=updates,
                    ip_address=request.client.host if request.client else None)
    return _ok(TenantOut.model_validate(tenant).model_dump())


@router.post("/{tenant_id}/members")
def add_member(tenant_id: int, body: TenantMemberAdd, request: Request,
               current_user: User = Depends(require_permissions("tenants:write")),
               db: Session = Depends(get_db)):
    tenant = TenantService.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    try:
        TenantService.add_member(db, tenant, body.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=current_user.id, action="add_tenant_member", resource_type="tenant",
                    resource_id=tenant_id, details={"member_id": body.user_id},
                    ip_address=request.client.host if request.client else None)
    return _ok(message="Member added")


@router.delete("/{tenant_id}/members/{user_id}")
def remove_member(tenant_id: int, user_id: int, request: Request,
                  current_user: User = Depends(require_permissions("tenants:write")),
                  db: Session = Depends(get_db)):
    tenant = TenantService.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    try:
        TenantService.remove_member(db, tenant, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=current_user.id, action="remove_tenant_member", resource_type="tenant",
                    resource_id=tenant_id, details={"member_id": user_id},
                    ip_address=request.client.host if request.client else None)
    return _ok(message="Member removed")


@router.put("/{tenant_id}/quota")
def update_quota(tenant_id: int, body: TenantQuotaUpdate, request: Request,
                 current_user: User = Depends(require_permissions("tenants:admin")),
                 db: Session = Depends(get_db)):
    tenant = TenantService.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant = TenantService.update_quota(
        db, tenant,
        compute_quota=body.compute_quota,
        storage_quota=body.storage_quota,
        max_concurrent_tasks=body.max_concurrent_tasks,
    )

    write_audit_log(db, user_id=current_user.id, action="update_tenant_quota", resource_type="tenant",
                    resource_id=tenant_id, details=body.model_dump(exclude_unset=True),
                    ip_address=request.client.host if request.client else None)
    return _ok(TenantOut.model_validate(tenant).model_dump())


@router.delete("/{tenant_id}")
def delete_tenant(tenant_id: int, request: Request,
                  current_user: User = Depends(require_permissions("tenants:admin")),
                  db: Session = Depends(get_db)):
    tenant = TenantService.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    TenantService.delete(db, tenant)

    write_audit_log(db, user_id=current_user.id, action="delete_tenant", resource_type="tenant",
                    resource_id=tenant_id,
                    ip_address=request.client.host if request.client else None)
    return _ok(message="Tenant deleted")
