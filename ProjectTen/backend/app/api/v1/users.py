from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_admin, require_permissions, write_audit_log
from app.models.user import User
from app.schemas.user import UserBrief, UserOut, UserUpdate, UserStatusUpdate
from app.services.user_service import UserService
from app.utils.pagination import PaginationParams, paginate

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return _ok(UserOut.model_validate(current_user).model_dump())


@router.put("/me")
def update_me(body: UserUpdate, request: Request, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    updates = body.model_dump(exclude_unset=True)
    user = UserService.update_user(db, current_user, **updates)

    write_audit_log(db, user_id=current_user.id, action="update_profile", resource_type="user",
                    resource_id=current_user.id, details=updates,
                    ip_address=request.client.host if request.client else None)
    return _ok(UserOut.model_validate(user).model_dump())


@router.get("/")
@router.get("")
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    user_type: Optional[str] = None,
    keyword: Optional[str] = None,
    current_user: User = Depends(require_permissions("users:read")),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page, page_size)
    users, total = UserService.list_users(db, pagination, status=status, user_type=user_type, keyword=keyword)
    items = [UserBrief.model_validate(u).model_dump() for u in users]
    return _ok(paginate(items, total, page, page_size))


@router.get("/{user_id}")
def get_user(user_id: int, current_user: User = Depends(require_permissions("users:read")),
             db: Session = Depends(get_db)):
    user = UserService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _ok(UserOut.model_validate(user).model_dump())


@router.put("/{user_id}/status")
def update_user_status(user_id: int, body: UserStatusUpdate, request: Request,
                       current_user: User = Depends(require_admin),
                       db: Session = Depends(get_db)):
    user = UserService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user = UserService.update_status(db, user, body.status)

    write_audit_log(db, user_id=current_user.id, action="update_user_status", resource_type="user",
                    resource_id=user_id, details={"status": body.status},
                    ip_address=request.client.host if request.client else None)
    return _ok(UserOut.model_validate(user).model_dump())


@router.delete("/{user_id}")
def delete_user(user_id: int, request: Request,
                current_user: User = Depends(require_admin),
                db: Session = Depends(get_db)):
    user = UserService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    UserService.delete_user(db, user)

    write_audit_log(db, user_id=current_user.id, action="delete_user", resource_type="user",
                    resource_id=user_id,
                    ip_address=request.client.host if request.client else None)
    return _ok(message="User deleted")
