from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_permissions, write_audit_log
from app.models.user import User
from app.models.report import UserReportArchive
from app.schemas.report import ArchiveCreate, ArchiveOut, ReportCompareRequest, ReportGenerate, ReportOut, ReportShare
from app.services.report_service import ReportService
from app.utils.pagination import PaginationParams, paginate

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.post("/generate/{task_id}")
def generate_report(task_id: int, body: ReportGenerate, request: Request,
                    current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    try:
        report = ReportService.generate(
            db, task_id=task_id, creator_id=current_user.id,
            tenant_id=current_user.tenant_id,
            title=body.title, report_type=body.report_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=current_user.id, action="generate_report", resource_type="report",
                    resource_id=report.id, ip_address=request.client.host if request.client else None)
    return _ok(ReportOut.model_validate(report).model_dump())


@router.get("/")
@router.get("")
def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.evaluation import EvaluationTask
    from app.models.asset import DigitalAsset
    
    pagination = PaginationParams(page, page_size)
    reports, total = ReportService.list_reports(
        db, pagination,
        creator_id=current_user.id if current_user.user_type != "admin" else None,
        status=status,
    )
    
    # Build response with task and image info
    items = []
    for report in reports:
        task = db.query(EvaluationTask).filter(EvaluationTask.id == report.task_id).first()
        item = {
            "id": report.id,
            "task_id": report.task_id,
            "title": report.title,
            "report_type": report.report_type,
            "content": report.content,
            "version": report.version,
            "status": report.status,
            "file_path": report.file_path,
            "creator_id": report.creator_id,
            "tenant_id": report.tenant_id,
            "is_public": report.is_public,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "updated_at": report.updated_at.isoformat() if report.updated_at else None,
            # Task info
            "eval_name": task.name if task else None,
            "task_category": task.task_category if task else None,
            "task_type": task.task_type if task else None,
            "device_type": task.device_type if task else None,
            "progress": task.progress if task else None,
        }
        # Add image and model name info if task has image_id
        if task and task.image_id:
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


@router.get("/archives")
def list_archives(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.report import EvaluationReport
    from app.models.evaluation import EvaluationTask
    from app.models.asset import DigitalAsset
    
    # Query archives with joined report info
    query = db.query(UserReportArchive).join(
        EvaluationReport, UserReportArchive.report_id == EvaluationReport.id
    ).filter(
        UserReportArchive.user_id == current_user.id
    ).order_by(UserReportArchive.archived_at.desc())
    
    # Pagination
    total = query.count()
    archives = query.offset((page - 1) * page_size).limit(page_size).all()
    
    # Build response with report and task info (same as list_reports)
    items = []
    for archive in archives:
        report = archive.report
        task = db.query(EvaluationTask).filter(EvaluationTask.id == report.task_id).first() if report else None
        
        item = {
            "id": archive.id,
            "user_id": archive.user_id,
            "report_id": archive.report_id,
            "note": archive.note,
            "archived_at": archive.archived_at.isoformat() if archive.archived_at else None,
            # Report info
            "report_title": report.title if report else None,
            "report_type": report.report_type if report else None,
            "report_status": report.status if report else None,
            "task_id": report.task_id if report else None,
            # Task info (same as list_reports)
            "eval_name": task.name if task else None,
            "task_category": task.task_category.value if task and task.task_category else None,
            "task_type": task.task_type.value if task and task.task_type else None,
            "device_type": task.device_type if task else None,
            "progress": task.progress if task else None,
        }
        
        # Add image and model name info if task has image_id
        if task and task.image_id:
            image = db.query(DigitalAsset).filter(DigitalAsset.id == task.image_id).first()
            if image:
                item["image_name"] = image.name
                # Parse model name from image name (format: "Chip + Framework + Model")
                parts = image.name.split(" + ")
                item["model_name"] = parts[2].strip() if len(parts) > 2 else (parts[1].strip() if len(parts) > 1 else image.name)
                item["chip_name"] = parts[0].strip() if parts else image.name
                item["framework_name"] = parts[1].strip() if len(parts) > 1 else None
        
        items.append(item)
    
    return _ok({"items": items, "total": total, "page": page, "page_size": page_size})


@router.get("/{report_id}")
def get_report(report_id: int, current_user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    report = ReportService.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _ok(ReportOut.model_validate(report).model_dump())


@router.get("/{report_id}/download")
def download_report(report_id: int, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    report = ReportService.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    # Return report content as downloadable JSON
    import json
    from fastapi.responses import Response
    content = report.content or "{}"
    try:
        parsed = json.loads(content) if isinstance(content, str) else content
    except (json.JSONDecodeError, TypeError):
        parsed = {"raw": content}
    report_data = {
        "report_id": report.id,
        "title": report.title,
        "report_type": report.report_type,
        "status": report.status,
        "created_at": str(report.created_at),
        **parsed,
    }
    json_bytes = json.dumps(report_data, ensure_ascii=False, indent=2).encode("utf-8")
    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="report_{report.id}.json"'},
    )


@router.post("/{report_id}/share")
def share_report(report_id: int, body: ReportShare, request: Request,
                 current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    report = ReportService.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report = ReportService.share(db, report, body.is_public)

    write_audit_log(db, user_id=current_user.id, action="share_report", resource_type="report",
                    resource_id=report_id, details={"is_public": body.is_public},
                    ip_address=request.client.host if request.client else None)
    return _ok(ReportOut.model_validate(report).model_dump())


@router.post("/{report_id}/archive")
def archive_report(report_id: int, 
                   body: Optional[ArchiveCreate] = None,
                   current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    report = ReportService.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Check if already archived by this user
    existing = db.query(UserReportArchive).filter(
        UserReportArchive.user_id == current_user.id,
        UserReportArchive.report_id == report_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Report already archived")

    archive = UserReportArchive(
        user_id=current_user.id,
        report_id=report_id,
        note=body.note if body else None,
    )
    db.add(archive)
    db.commit()
    db.refresh(archive)
    return _ok(ArchiveOut.model_validate(archive).model_dump())


@router.delete("/archives/{archive_id}")
def delete_archive(archive_id: int,
                   current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    archive = db.query(UserReportArchive).filter(
        UserReportArchive.id == archive_id,
        UserReportArchive.user_id == current_user.id,
    ).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    db.delete(archive)
    db.commit()
    return _ok(message="Archive deleted")


@router.post("/compare")
def compare_reports(body: ReportCompareRequest,
                    current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    try:
        reports = ReportService.compare(db, body.report_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    items = [ReportOut.model_validate(r).model_dump() for r in reports]
    return _ok(items)
