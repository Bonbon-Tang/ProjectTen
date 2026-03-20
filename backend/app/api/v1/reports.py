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
    pagination = PaginationParams(page, page_size)
    reports, total = ReportService.list_reports(
        db, pagination,
        creator_id=current_user.id if current_user.user_type != "admin" else None,
        status=status,
    )
    items = [ReportOut.model_validate(r).model_dump() for r in reports]
    return _ok(paginate(items, total, page, page_size))


@router.get("/archives")
def list_archives(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    archives = db.query(UserReportArchive).filter(
        UserReportArchive.user_id == current_user.id
    ).order_by(UserReportArchive.archived_at.desc()).all()
    items = [ArchiveOut.model_validate(a).model_dump() for a in archives]
    return _ok(items)


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
    if not report.file_path:
        raise HTTPException(status_code=400, detail="Report file not generated yet")
    return FileResponse(report.file_path, filename=f"report_{report.id}.pdf")


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
def archive_report(report_id: int, body: ArchiveCreate,
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
        note=body.note,
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
