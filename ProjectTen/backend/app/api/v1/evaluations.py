from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, is_tenant_user, require_permissions, write_audit_log
from app.models.user import User
from app.schemas.evaluation import (
    EvaluationCreate,
    EvaluationOut,
    BatchDeleteRequest,
    BatchDeleteResponse,
    EvaluationStatsOut,
)
from app.services.evaluation_service import EvaluationService
from app.services.task_runtime_service import TaskRuntimeService
from app.utils.pagination import PaginationParams, paginate

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


class EvaluationPostAction(BaseModel):
    save_image: bool = False
    include_in_ranking: bool = True


class EvaluationPreflightRequest(BaseModel):
    task_category: Optional[str] = None
    task_type: str
    device_type: Optional[str] = None
    image_id: Optional[int] = None
    toolset_id: Optional[int] = None


@router.get("/stats")
def get_evaluation_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return real task count statistics from database."""
    tenant_id = current_user.tenant_id if is_tenant_user(current_user) else None
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


@router.post("/preflight")
def evaluation_preflight(
    body: EvaluationPreflightRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.asset import DigitalAsset

    checks = []
    compatible = True
    recommended_image = None

    if body.image_id:
        image = db.query(DigitalAsset).filter(DigitalAsset.id == body.image_id).first()
        if image:
            tags = image.tags or []
            device_match = (body.device_type in tags) or any((body.device_type or '').split('_')[-1].upper() in str(tag).upper() for tag in tags) if body.device_type else True
            scenario_match = body.task_type in tags if body.task_type else True
            checks.append({"name": "镜像存在", "status": "pass", "message": f"已找到镜像 {image.name}"})
            checks.append({"name": "设备兼容", "status": "pass" if device_match else "warn", "message": "镜像标签与设备匹配" if device_match else "镜像未显式标记当前设备"})
            checks.append({"name": "场景兼容", "status": "pass" if scenario_match else "warn", "message": "镜像包含该场景标签" if scenario_match else "镜像未显式标记该场景"})
            compatible = compatible and device_match
            recommended_image = {"id": image.id, "name": image.name}
        else:
            compatible = False
            checks.append({"name": "镜像存在", "status": "fail", "message": "镜像不存在"})
    else:
        checks.append({"name": "镜像选择", "status": "warn", "message": "未指定镜像，建议先选择部署镜像"})

    if body.task_category == 'operator_test' and not body.toolset_id:
        compatible = False
        checks.append({"name": "工具集", "status": "fail", "message": "算子评测必须选择工具集"})
    elif body.task_category == 'operator_test':
        checks.append({"name": "工具集", "status": "pass", "message": "算子评测工具集已配置"})

    return _ok({
        "compatible": compatible,
        "checks": checks,
        "recommended_image": recommended_image,
        "risk_level": "low" if compatible else "medium",
        "summary": "可执行" if compatible else "建议先修正镜像/工具配置",
    })


@router.post("/")
@router.post("")
def create_evaluation(body: EvaluationCreate, request: Request,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    import logging
    logging.info(f"CREATE EVAL body: {body.model_dump()}")
    if not (getattr(current_user.user_type, 'value', current_user.user_type) == 'admin' or is_tenant_user(current_user)):
        raise HTTPException(status_code=403, detail='Only admin or tenant users can create evaluations')
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
    from app.models.asset import DigitalAsset
    
    from app.models.evaluation import EvaluationTask
    from sqlalchemy import or_

    pagination = PaginationParams(page, page_size)

    if getattr(current_user.user_type, 'value', current_user.user_type) == 'admin':
        tasks, total = EvaluationService.list_tasks(
            db, pagination, status=status, task_type=task_type,
        )
    elif is_tenant_user(current_user):
        q = db.query(EvaluationTask)
        if status:
            q = q.filter(EvaluationTask.status == status)
        if task_type:
            q = q.filter(EvaluationTask.task_type == task_type)
        q = q.filter(
            or_(
                EvaluationTask.creator_id == current_user.id,
                EvaluationTask.visibility == 'platform',
            )
        )
        total = q.count()
        tasks = q.order_by(EvaluationTask.created_at.desc()).offset(pagination.offset).limit(pagination.limit).all()
    else:
        q = db.query(EvaluationTask)
        if status:
            q = q.filter(EvaluationTask.status == status)
        if task_type:
            q = q.filter(EvaluationTask.task_type == task_type)
        q = q.filter(
            or_(
                EvaluationTask.creator_id == current_user.id,
                EvaluationTask.visibility == 'platform',
            )
        )
        total = q.count()
        tasks = q.order_by(EvaluationTask.created_at.desc()).offset(pagination.offset).limit(pagination.limit).all()
    
    # Build response with image/model info
    items = []
    for task in tasks:
        item = EvaluationOut.model_validate(task).model_dump()
        # Add image and model name info for model_test tasks
        if task.image_id:
            image = db.query(DigitalAsset).filter(DigitalAsset.id == task.image_id).first()
            if image:
                item["image_name"] = image.name
                # Parse model name from image name (format: "Chip + Framework + Model")
                parts = image.name.split(" + ")
                item["model_name"] = parts[2].strip() if len(parts) > 2 else (parts[1].strip() if len(parts) > 1 else image.name)
                item["chip_name"] = parts[0].strip() if parts else image.name
                item["framework_name"] = parts[1].strip() if len(parts) > 1 else None
        items.append(item)
    
    return _ok(paginate(items, total, page, page_size))


@router.get("/{task_id}")
def get_evaluation(task_id: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if getattr(current_user.user_type, 'value', current_user.user_type) != 'admin':
        if not is_tenant_user(current_user):
            raise HTTPException(status_code=403, detail='No permission to access this task')
        if task.creator_id != current_user.id and getattr(task, 'visibility', 'private') != 'platform':
            raise HTTPException(status_code=403, detail='No permission to access this task')
    # Refresh to get latest progress from DB
    db.refresh(task)
    data = EvaluationOut.model_validate(task).model_dump()
    # Attach report_id if a report exists for this task
    from app.models.report import EvaluationReport
    report = db.query(EvaluationReport).filter(EvaluationReport.task_id == task_id).first()
    data["report_id"] = report.id if report else None
    latest_run = TaskRuntimeService.latest_run(db, task_type="evaluation", task_id=task_id)
    data["run"] = {
        "id": latest_run.id,
        "run_no": latest_run.run_no,
        "status": latest_run.status,
        "stage": latest_run.stage,
        "executor": latest_run.executor,
        "resource_snapshot": latest_run.resource_snapshot,
        "result_snapshot": latest_run.result_snapshot,
        "error_message": latest_run.error_message,
        "started_at": latest_run.started_at,
        "finished_at": latest_run.finished_at,
    } if latest_run else None
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
    # Attach image name and model info
    if task.image_id:
        from app.models.asset import DigitalAsset
        image = db.query(DigitalAsset).filter(DigitalAsset.id == task.image_id).first()
        if image:
            data["image_name"] = image.name
            # Parse model name from image name (format: "Chip + Framework + Model")
            parts = image.name.split(" + ")
            data["model_name"] = parts[2].strip() if len(parts) > 2 else (parts[1].strip() if len(parts) > 1 else image.name)
            data["chip_name"] = parts[0].strip() if parts else image.name
            data["framework_name"] = parts[1].strip() if len(parts) > 1 else None
        else:
            data["image_name"] = None
            data["model_name"] = None
            data["chip_name"] = None
            data["framework_name"] = None
    else:
        data["image_name"] = None
        data["model_name"] = None
        data["chip_name"] = None
        data["framework_name"] = None
    return _ok(data)


@router.get("/{task_id}/logs")
def get_task_logs(task_id: int, current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    runtime_logs = TaskRuntimeService.list_logs(db, task_type="evaluation", task_id=task_id)
    logs = [
        {
            "timestamp": str(log.created_at),
            "level": log.level,
            "stage": log.stage,
            "message": log.message,
            "details": log.details,
        }
        for log in runtime_logs
    ]
    if not logs:
        logs = [
            {"timestamp": str(task.created_at), "level": "INFO", "message": f"Task '{task.name}' created"},
        ]

    if task.device_type == 'cpu_test':
        txt_path, _ = EvaluationService._cpu_test_report_paths(task_id)
        if txt_path.exists():
            for line in txt_path.read_text(encoding='utf-8').splitlines():
                if not line.strip():
                    continue
                logs.append({"timestamp": str(task.updated_at or task.created_at), "level": "INFO", "message": line})

    return _ok({
        "task_id": task_id,
        "logs": logs,
    })


@router.post("/{task_id}/start")
def start_evaluation(task_id: int, request: Request,
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not (getattr(current_user.user_type, 'value', current_user.user_type) == 'admin' or is_tenant_user(current_user)):
        raise HTTPException(status_code=403, detail='Only admin or tenant users can start evaluations')
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
    if not (getattr(current_user.user_type, 'value', current_user.user_type) == 'admin' or is_tenant_user(current_user)):
        raise HTTPException(status_code=403, detail='Only admin or tenant users can stop evaluations')
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


@router.post("/{task_id}/post-actions")
def set_evaluation_post_actions(
    task_id: int,
    body: EvaluationPostAction,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = EvaluationService.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if str(task.status) != 'TaskStatus.completed' and getattr(task.status, 'value', task.status) != 'completed':
        raise HTTPException(status_code=400, detail='Only completed tasks can set post actions')

    config = dict(task.config or {})
    config['save_image'] = body.save_image
    config['include_in_ranking'] = body.include_in_ranking
    task.config = config
    db.commit()
    db.refresh(task)

    write_audit_log(
        db,
        user_id=current_user.id,
        action="set_evaluation_post_actions",
        resource_type="evaluation",
        resource_id=task_id,
        details=body.model_dump(),
        ip_address=request.client.host if request.client else None,
    )
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
