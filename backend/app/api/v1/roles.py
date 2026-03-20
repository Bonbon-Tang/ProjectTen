from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_admin, require_permissions, write_audit_log
from app.models.role import Role
from app.models.user import User, UserRole
from app.utils.pagination import PaginationParams, paginate

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


# ------------ Schemas for roles API (inline, small) ------------

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tenant_id: Optional[int] = None
    permissions: List[str] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None


class RoleAssign(BaseModel):
    user_id: int


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_system: bool
    tenant_id: Optional[int] = None
    permissions: List[str] = []

    model_config = {"from_attributes": True}


# ------------ Endpoints ------------

@router.post("/")
@router.post("")
def create_role(body: RoleCreate, request: Request,
                current_user: User = Depends(require_permissions("roles:write")),
                db: Session = Depends(get_db)):
    role = Role(name=body.name, description=body.description, tenant_id=body.tenant_id,
                permissions=body.permissions, is_system=False)
    db.add(role)
    db.commit()
    db.refresh(role)

    write_audit_log(db, user_id=current_user.id, action="create_role", resource_type="role",
                    resource_id=role.id, ip_address=request.client.host if request.client else None)
    return _ok(RoleOut.model_validate(role).model_dump())


@router.get("/")
@router.get("")
def list_roles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_permissions("roles:read")),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page, page_size)
    q = db.query(Role)
    total = q.count()
    roles = q.offset(pagination.offset).limit(pagination.limit).all()
    items = [RoleOut.model_validate(r).model_dump() for r in roles]
    return _ok(paginate(items, total, page, page_size))


@router.put("/{role_id}")
def update_role(role_id: int, body: RoleUpdate, request: Request,
                current_user: User = Depends(require_permissions("roles:write")),
                db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot modify system role")
    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(role, k, v)
    db.commit()
    db.refresh(role)

    write_audit_log(db, user_id=current_user.id, action="update_role", resource_type="role",
                    resource_id=role_id, details=updates,
                    ip_address=request.client.host if request.client else None)
    return _ok(RoleOut.model_validate(role).model_dump())


@router.delete("/{role_id}")
def delete_role(role_id: int, request: Request,
                current_user: User = Depends(require_permissions("roles:write")),
                db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system role")
    db.delete(role)
    db.commit()

    write_audit_log(db, user_id=current_user.id, action="delete_role", resource_type="role",
                    resource_id=role_id, ip_address=request.client.host if request.client else None)
    return _ok(message="Role deleted")


@router.post("/{role_id}/assign")
def assign_role(role_id: int, body: RoleAssign, request: Request,
                current_user: User = Depends(require_permissions("roles:assign")),
                db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(UserRole).filter(UserRole.user_id == body.user_id, UserRole.role_id == role_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role already assigned to user")

    db.add(UserRole(user_id=body.user_id, role_id=role_id))
    db.commit()

    write_audit_log(db, user_id=current_user.id, action="assign_role", resource_type="role",
                    resource_id=role_id, details={"target_user": body.user_id},
                    ip_address=request.client.host if request.client else None)
    return _ok(message="Role assigned")


@router.delete("/{role_id}/revoke/{user_id}")
def revoke_role(role_id: int, user_id: int, request: Request,
                current_user: User = Depends(require_permissions("roles:assign")),
                db: Session = Depends(get_db)):
    link = db.query(UserRole).filter(UserRole.user_id == user_id, UserRole.role_id == role_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Role assignment not found")
    db.delete(link)
    db.commit()

    write_audit_log(db, user_id=current_user.id, action="revoke_role", resource_type="role",
                    resource_id=role_id, details={"target_user": user_id},
                    ip_address=request.client.host if request.client else None)
    return _ok(message="Role revoked")
