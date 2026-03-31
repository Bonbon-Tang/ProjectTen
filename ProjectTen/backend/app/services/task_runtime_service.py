from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.task_runtime import AdaptationAction, TaskLog, TaskRun


class TaskRuntimeService:
    @staticmethod
    def ensure_tables(db: Session) -> None:
        bind = db.get_bind()
        TaskRun.__table__.create(bind, checkfirst=True)
        TaskLog.__table__.create(bind, checkfirst=True)
        AdaptationAction.__table__.create(bind, checkfirst=True)

    @staticmethod
    def start_run(
        db: Session,
        *,
        task_type: str,
        task_id: int,
        stage: str,
        executor: str = "simulator",
        resource_snapshot: Optional[dict] = None,
    ) -> TaskRun:
        TaskRuntimeService.ensure_tables(db)
        last_run = (
            db.query(TaskRun)
            .filter(TaskRun.task_type == task_type, TaskRun.task_id == task_id)
            .order_by(TaskRun.run_no.desc())
            .first()
        )
        run = TaskRun(
            task_type=task_type,
            task_id=task_id,
            run_no=(last_run.run_no + 1) if last_run else 1,
            status="running",
            stage=stage,
            executor=executor,
            resource_snapshot=resource_snapshot or {},
            started_at=datetime.utcnow(),
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def append_log(
        db: Session,
        *,
        task_type: str,
        task_id: int,
        message: str,
        level: str = "INFO",
        stage: Optional[str] = None,
        details: Optional[dict] = None,
        task_run_id: Optional[int] = None,
    ) -> TaskLog:
        TaskRuntimeService.ensure_tables(db)
        if task_run_id is None:
            last_run = (
                db.query(TaskRun)
                .filter(TaskRun.task_type == task_type, TaskRun.task_id == task_id)
                .order_by(TaskRun.run_no.desc())
                .first()
            )
            task_run_id = last_run.id if last_run else None
        if task_run_id is None:
            raise ValueError("task run not found for log append")
        log = TaskLog(
            task_run_id=task_run_id,
            task_type=task_type,
            task_id=task_id,
            stage=stage,
            level=level,
            message=message,
            details=details,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def update_run_stage(db: Session, run: TaskRun, *, stage: str, status: Optional[str] = None) -> TaskRun:
        run.stage = stage
        if status:
            run.status = status
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def finish_run(
        db: Session,
        run: TaskRun,
        *,
        status: str,
        stage: str,
        result_snapshot: Optional[dict] = None,
        error_message: Optional[str] = None,
    ) -> TaskRun:
        run.status = status
        run.stage = stage
        run.result_snapshot = result_snapshot
        run.error_message = error_message
        run.finished_at = datetime.utcnow()
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def list_logs(db: Session, *, task_type: str, task_id: int, offset: int = 0, limit: int = 200):
        query = (
            db.query(TaskLog)
            .filter(TaskLog.task_type == task_type, TaskLog.task_id == task_id)
            .order_by(TaskLog.id.asc())
        )
        return query.offset(max(offset, 0)).limit(min(max(limit, 1), 500)).all()

    @staticmethod
    def latest_run(db: Session, *, task_type: str, task_id: int) -> Optional[TaskRun]:
        return (
            db.query(TaskRun)
            .filter(TaskRun.task_type == task_type, TaskRun.task_id == task_id)
            .order_by(TaskRun.run_no.desc())
            .first()
        )

    @staticmethod
    def create_adaptation_actions(db: Session, adaptation_id: int, actions: list[dict]) -> None:
        TaskRuntimeService.ensure_tables(db)
        db.query(AdaptationAction).filter(AdaptationAction.adaptation_id == adaptation_id).delete()
        for idx, action in enumerate(actions, start=1):
            db.add(AdaptationAction(
                adaptation_id=adaptation_id,
                step_no=idx,
                action_type=action.get("action_type", "adjust"),
                title=action.get("title", f"步骤 {idx}"),
                before_value=action.get("before_value"),
                after_value=action.get("after_value"),
                reason=action.get("reason"),
                status=action.get("status", "completed"),
            ))
        db.commit()

    @staticmethod
    def list_adaptation_actions(db: Session, adaptation_id: int):
        TaskRuntimeService.ensure_tables(db)
        return (
            db.query(AdaptationAction)
            .filter(AdaptationAction.adaptation_id == adaptation_id)
            .order_by(AdaptationAction.step_no.asc())
            .all()
        )
