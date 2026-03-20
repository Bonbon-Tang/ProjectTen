from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_permissions, write_audit_log
from app.models.user import User
from app.schemas.evaluation import (
    EvaluationCreate,
    EvaluationOut,
    BatchDeleteRequest,
    BatchDeleteResponse,
    EvaluationStatsOut,
)
from app.services.evaluation_service import EvaluationService
from app.utils.pagination import PaginationParams, paginate

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.get("/stats")
def get_evaluation_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return real task count statistics from database."""
    tenant_id = current_user.tenant_id if current_user.user_type != "admin" else None
    stats = EvaluationService.get_stats(db, tenant_id=tenant_id)
    return _ok(stats)


@router.post("/batch-delete")
def batch_delete_evaluations(
    body: BatchDeleteRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Batch delete tasks. Running tasks are skipped."""
    result = EvaluationService.batch_delete(db, body.task_ids)

    write_audit_log(
        db, user_id=current_user.id, action="batch_delete_evaluations",
        resource_type="evaluation",
        details={"task_ids": body.task_ids, "result": result},
        ip_address=request.client.host if request.client else None,
    )
    return _ok(result)


@router.post("/")
@router.post("")
def create_evaluation(body: EvaluationCreate, request: Request,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    import logging
    logging.info(f"CREATE EVAL body: {body.model_dump()}")
    try:
        task = EvaluationService.create(
            db,
            creator_id=current_user.id,
            tenant_id=current_user.tenant_id,
            **body.model_dump(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=current_user.id, action="create_evaluation", resource_type="evaluation",
                    resource_id=task.id, ip_address=request.client.host if request.client else None)
    return _ok(EvaluationOut.model_validate(task).model_dump())


@router.get("/")
@router.get("")
def list_evaluations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page, page_size)
    tasks, total = EvaluationService.list_tasks(
        db, pagination, status=status, task_type=task_type,
        creator_id=current_user.id if current_user.user_type != "admin" else None,
    )
    items = [EvaluationOut.model_validate(t).model_dump() for t in tasks]
    return _ok(paginate(items, total, page, page_size))


@router.get("/{task_id}")
def get_evaluation(task_id: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Refresh to get latest progress from DB
    db.refresh(task)
    data = EvaluationOut.model_validate(task).model_dump()
    # Attach report_id if a report exists for this task
    from app.models.report import EvaluationReport
    report = db.query(EvaluationReport).filter(EvaluationReport.task_id == task_id).first()
    data["report_id"] = report.id if report else None
    # Attach toolset name
    if task.toolset_id:
        from app.models.asset import DigitalAsset
        toolset = db.query(DigitalAsset).filter(DigitalAsset.id == task.toolset_id).first()
        data["toolset_name"] = toolset.name if toolset else None
    else:
        data["toolset_name"] = None
    # Attach operator library name
    if task.operator_lib_id:
        from app.models.asset import DigitalAsset
        op_lib = db.query(DigitalAsset).filter(DigitalAsset.id == task.operator_lib_id).first()
        data["operator_lib_name"] = op_lib.name if op_lib else None
    else:
        data["operator_lib_name"] = None
    # Attach image name
    if task.image_id:
        from app.models.asset import DigitalAsset
        image = db.query(DigitalAsset).filter(DigitalAsset.id == task.image_id).first()
        data["image_name"] = image.name if image else None
    else:
        data["image_name"] = None
    return _ok(data)


@router.get("/{task_id}/logs")
def get_task_logs(task_id: int, current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _ok({
        "task_id": task_id,
        "logs": [
            {"timestamp": str(task.created_at), "level": "INFO", "message": f"Task '{task.name}' created"},
        ],
    })


@router.post("/{task_id}/start")
def start_evaluation(task_id: int, request: Request,
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        task = EvaluationService.start(db, task)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Launch background simulation
    EvaluationService.simulate_task_execution(task.id)

    write_audit_log(db, user_id=current_user.id, action="start_evaluation", resource_type="evaluation",
                    resource_id=task_id, ip_address=request.client.host if request.client else None)
    return _ok(message="任务已启动，预计1-2分钟完成")


@router.post("/{task_id}/stop")
def stop_evaluation(task_id: int, request: Request,
                    current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        task = EvaluationService.stop(db, task)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=current_user.id, action="stop_evaluation", resource_type="evaluation",
                    resource_id=task_id, ip_address=request.client.host if request.client else None)
    return _ok(EvaluationOut.model_validate(task).model_dump())


@router.post("/{task_id}/retry")
def retry_evaluation(task_id: int, request: Request,
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        task = EvaluationService.retry(db, task)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=current_user.id, action="retry_evaluation", resource_type="evaluation",
                    resource_id=task_id, ip_address=request.client.host if request.client else None)
    return _ok(EvaluationOut.model_validate(task).model_dump())


@router.delete("/{task_id}")
def delete_evaluation(task_id: int, request: Request,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        EvaluationService.delete(db, task)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=current_user.id, action="delete_evaluation", resource_type="evaluation",
                    resource_id=task_id, ip_address=request.client.host if request.client else None)
    return _ok(message="Task deleted")
