from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.report import EvaluationReport, ReportType, ReportStatus
from app.models.evaluation import EvaluationTask
from app.utils.pagination import PaginationParams


class ReportService:

    @staticmethod
    def generate(db: Session, *, task_id: int, creator_id: int, tenant_id: Optional[int] = None,
                 title: str, report_type: str = "basic") -> EvaluationReport:
        task = db.query(EvaluationTask).filter(EvaluationTask.id == task_id).first()
        if not task:
            raise ValueError("Task not found")

        report = EvaluationReport(
            task_id=task_id,
            title=title,
            report_type=ReportType(report_type),
            content=None,  # Will be populated by actual report generation
            creator_id=creator_id,
            tenant_id=tenant_id,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def list_reports(
        db: Session,
        pagination: PaginationParams,
        *,
        creator_id: Optional[int] = None,
        tenant_id: Optional[int] = None,
        status: Optional[str] = None,
        include_public: bool = False,
    ) -> Tuple[List[EvaluationReport], int]:
        from sqlalchemy import or_

        q = db.query(EvaluationReport)
        if include_public and creator_id:
            q = q.filter(or_(EvaluationReport.creator_id == creator_id, EvaluationReport.is_public == True))
        else:
            if creator_id:
                q = q.filter(EvaluationReport.creator_id == creator_id)
        if tenant_id:
            q = q.filter(EvaluationReport.tenant_id == tenant_id)
        if status:
            q = q.filter(EvaluationReport.status == status)
        total = q.count()
        items = q.order_by(EvaluationReport.created_at.desc()).offset(pagination.offset).limit(pagination.limit).all()
        return items, total

    @staticmethod
    def get_by_id(db: Session, report_id: int) -> Optional[EvaluationReport]:
        return db.query(EvaluationReport).filter(EvaluationReport.id == report_id).first()

    @staticmethod
    def share(db: Session, report: EvaluationReport, is_public: bool) -> EvaluationReport:
        report.is_public = is_public
        if is_public:
            report.status = ReportStatus.published
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def compare(db: Session, report_ids: List[int]) -> List[EvaluationReport]:
        reports = db.query(EvaluationReport).filter(EvaluationReport.id.in_(report_ids)).all()
        if len(reports) != len(report_ids):
            raise ValueError("Some reports not found")
        return reports
