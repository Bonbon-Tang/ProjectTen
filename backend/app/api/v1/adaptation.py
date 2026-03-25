from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, is_tenant_user, write_audit_log
from app.models.user import User
from app.schemas.adaptation import AdaptationCreate, AdaptationOut
from app.services.adaptation_service import AdaptationService
from app.utils.pagination import PaginationParams

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


class AdaptationPostAction(BaseModel):
    save_image: bool = False
    include_in_ranking: bool = True
    saved_image_name: str | None = None


@router.post("/")
def create_adaptation(
    body: AdaptationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not (getattr(current_user.user_type, 'value', current_user.user_type) == 'admin' or is_tenant_user(current_user)):
        raise HTTPException(status_code=403, detail='Only admin or tenant users can create adaptation tasks')

    task = AdaptationService.create(
        db,
        creator_id=current_user.id,
        tenant_id=current_user.tenant_id if is_tenant_user(current_user) else None,
        **body.model_dump(),
    )
    write_audit_log(
        db,
        user_id=current_user.id,
        action="create_adaptation",
        resource_type="adaptation_task",
        resource_id=task.id,
        details=body.model_dump(),
        ip_address=request.client.host if request.client else None,
    )
    return _ok(AdaptationOut.model_validate(task).model_dump())


@router.post("/{task_id}/post-actions")
def set_adaptation_post_actions(
    task_id: int,
    body: AdaptationPostAction,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = AdaptationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Adaptation task not found")
    if getattr(task.status, 'value', task.status) != 'completed':
        raise HTTPException(status_code=400, detail='Only completed adaptation tasks can set post actions')

    updated = AdaptationService.apply_post_actions(
        db,
        task,
        save_image=body.save_image,
        include_in_ranking=body.include_in_ranking,
        saved_image_name=body.saved_image_name,
    )
    write_audit_log(
        db,
        user_id=current_user.id,
        action="set_adaptation_post_actions",
        resource_type="adaptation_task",
        resource_id=task_id,
        details=body.model_dump(),
        ip_address=request.client.host if request.client else None,
    )
    return _ok(AdaptationOut.model_validate(updated).model_dump())


@router.get("/")
def list_adaptations(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not (getattr(current_user.user_type, 'value', current_user.user_type) == 'admin' or is_tenant_user(current_user)):
        raise HTTPException(status_code=403, detail='Only admin or tenant users can view adaptation tasks')

    pagination = PaginationParams(page, page_size)
    tasks, total = AdaptationService.list_tasks(
        db,
        pagination,
        creator_id=None if getattr(current_user.user_type, 'value', current_user.user_type) == 'admin' else current_user.id,
        tenant_id=current_user.tenant_id if is_tenant_user(current_user) else None,
    )
    items = [AdaptationService.with_image_name(db, task) for task in tasks]
    return _ok({"items": items, "total": total, "page": page, "page_size": page_size})
