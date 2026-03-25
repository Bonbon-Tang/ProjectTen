from __future__ import annotations

from typing import List, Optional, Tuple
import random
import threading
import time
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.adaptation import AdaptationTask
from app.models.asset import AssetStatus, AssetType, DigitalAsset, ShareScope
from app.services.evaluation_service import EvaluationService
from app.utils.pagination import PaginationParams


class AdaptationService:
    @staticmethod
    def get_by_id(db: Session, task_id: int) -> Optional[AdaptationTask]:
        return db.query(AdaptationTask).filter(AdaptationTask.id == task_id).first()

    @staticmethod
    def create(db: Session, *, creator_id: int, tenant_id: Optional[int] = None, **kwargs) -> AdaptationTask:
        image = None
        if kwargs.get("image_id"):
            image = db.query(DigitalAsset).filter(DigitalAsset.id == kwargs.get("image_id")).first()
        inherited_tags = list(image.tags or []) if image and isinstance(image.tags, list) else []


        task = AdaptationTask(
            name=kwargs["name"],
            image_id=kwargs.get("image_id"),
            creator_id=creator_id,
            tenant_id=tenant_id,
            device_type=kwargs["device_type"],
            device_count=kwargs.get("device_count") or 1,
            test_mode=kwargs.get("test_mode") or "standard",
            precision=kwargs.get("precision") or "bf16",
            # Saving adapted images is temporarily disabled to avoid unstable outputs.
            save_image=False,
            saved_image_name=None,
            save_notes=None,
            status="running",
            tags=inherited_tags,
            config=kwargs.get("config") or {},
            result={"stage": "queued", "message": "设备任务已启动，预计 1-2 分钟完成"},
            metrics=None,
            started_at=datetime.utcnow(),
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        AdaptationService.run_async(task.id)
        return task

    @staticmethod
    def list_tasks(
        db: Session,
        pagination: PaginationParams,
        *,
        creator_id: Optional[int] = None,
        tenant_id: Optional[int] = None,
    ) -> Tuple[List[AdaptationTask], int]:
        q = db.query(AdaptationTask)
        if creator_id:
            q = q.filter(AdaptationTask.creator_id == creator_id)
        if tenant_id:
            q = q.filter(AdaptationTask.tenant_id == tenant_id)
        total = q.count()
        items = q.order_by(AdaptationTask.created_at.desc()).offset(pagination.offset).limit(pagination.limit).all()
        return items, total

    @staticmethod
    def with_image_name(db: Session, task: AdaptationTask) -> dict:
        payload = {c.name: getattr(task, c.name) for c in task.__table__.columns}
        payload["image_name"] = None
        if task.image_id:
            image = db.query(DigitalAsset).filter(DigitalAsset.id == task.image_id).first()
            payload["image_name"] = image.name if image else None
        return payload

    @staticmethod
    def apply_post_actions(
        db: Session,
        task: AdaptationTask,
        *,
        save_image: bool,
        include_in_ranking: bool,
        saved_image_name: Optional[str] = None,
    ) -> AdaptationTask:
        image = db.query(DigitalAsset).filter(DigitalAsset.id == task.image_id).first() if task.image_id else None
        config = dict(task.config or {})
        config["save_image"] = save_image
        config["include_in_ranking"] = include_in_ranking
        task.config = config

        if save_image and image:
            saved_name = (saved_image_name or '').strip() or f"{image.name}-adapted-{task.id}"
            existing = db.query(DigitalAsset).filter(DigitalAsset.name == saved_name).first()
            if not existing:
                saved_asset = DigitalAsset(
                    name=saved_name,
                    description=(image.description or image.name) + f" | 适配任务 #{task.id} 生成",
                    asset_type=AssetType.image,
                    category=image.category,
                    tags=list(image.tags or []),
                    version=image.version,
                    file_path=(image.file_path or f"/images/{saved_name.lower()}.tar"),
                    file_size=image.file_size or 0.0,
                    status=AssetStatus.active,
                    creator_id=task.creator_id,
                    tenant_id=task.tenant_id,
                    is_shared=image.is_shared,
                    share_scope=image.share_scope or ShareScope.personal,
                )
                db.add(saved_asset)
                task.save_image = True
                task.saved_image_name = saved_name
            else:
                task.save_image = True
                task.saved_image_name = existing.name
        else:
            task.save_image = False
            task.saved_image_name = None

        if include_in_ranking and task.metrics and image:
            scenario_type = config.get("scenario_type") or 'llm'

            class _AdaptationBenchmarkTask:
                def __init__(self, adaptation_task, resolved_task_type):
                    self.image_id = adaptation_task.image_id
                    self.task_type = resolved_task_type
                    self.device_type = adaptation_task.device_type
                    self.id = adaptation_task.id

            EvaluationService._write_model_benchmark(db, _AdaptationBenchmarkTask(task, scenario_type), task.metrics)

        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def run_async(task_id: int) -> None:
        thread = threading.Thread(target=AdaptationService._run_task, args=(task_id,), daemon=True)
        thread.start()

    @staticmethod
    def _run_task(task_id: int) -> None:
        db = SessionLocal()
        try:
            task = db.query(AdaptationTask).filter(AdaptationTask.id == task_id).first()
            if not task:
                return

            time.sleep(5)
            db.refresh(task)
            task.result = {
                "stage": "adapting",
                "message": "正在启动设备并执行模型适配测试，预计 1-2 分钟完成",
            }
            db.commit()

            total_duration = random.randint(60, 120)
            elapsed = 0
            while elapsed < total_duration:
                time.sleep(10)
                elapsed += 10
                db.refresh(task)
                if task.status != "running":
                    return
                progress = min(int(elapsed / total_duration * 100), 95)
                task.result = {
                    "stage": "running",
                    "message": f"设备任务执行中，当前进度 {progress}%",
                    "progress": progress,
                }
                db.commit()

            db.refresh(task)
            image = db.query(DigitalAsset).filter(DigitalAsset.id == task.image_id).first() if task.image_id else None
            image_name = image.name if image else "未知镜像"
            task_type = "llm"
            if image and isinstance(image.tags, list):
                scenario_tags = [
                    'llm', 'multimodal', 'speech_recognition', 'image_classification', 'object_detection',
                    'semantic_segmentation', 'text_generation', 'machine_translation', 'sentiment_analysis',
                    'question_answering', 'text_summarization', 'speech_synthesis', 'image_generation',
                    'video_understanding', 'ocr', 'recommendation', 'anomaly_detection', 'time_series',
                    'reinforcement_learning', 'graph_neural_network', 'medical_imaging', 'autonomous_driving',
                    'robot_control', 'code_generation', 'knowledge_graph',
                ]
                task_type = next((tag for tag in image.tags if tag in scenario_tags), 'llm')

            configured_task_type = None
            if isinstance(task.config, dict):
                configured_task_type = task.config.get("scenario_type")
            resolved_task_type = configured_task_type or task_type
            metrics = EvaluationService._generate_model_metrics(
                resolved_task_type,
                image.name if image else "",
                task.device_type,
            )

            task.status = "completed"
            task.metrics = metrics
            task.completed_at = datetime.utcnow()
            task.updated_at = datetime.utcnow()
            task.result = {
                "stage": "completed",
                "success": True,
                "summary": f"镜像 {image_name} 已完成 {task.device_type} 适配测试",
                "accuracy": metrics.get("accuracy"),
                "accuracy_metric": metrics.get("accuracy_metric"),
                "performance_score": metrics.get("performance_score"),
                "software_completeness_score": metrics.get("software_completeness", {}).get("score"),
                "avg_latency_ms": metrics.get("avg_latency_ms"),
                "throughput": metrics.get("throughput"),
                "throughput_unit": metrics.get("throughput_unit"),
                "energy_efficiency": metrics.get("energy_efficiency"),
                "energy_efficiency_unit": metrics.get("energy_efficiency_unit"),
                "precision": task.precision,
                "device_type": task.device_type,
                "saved_image_name": task.saved_image_name if task.save_image else None,
            }
            db.commit()

            if task.image_id and isinstance(task.config, dict) and task.config.get("include_in_ranking", True):
                class _AdaptationBenchmarkTask:
                    def __init__(self, adaptation_task, resolved_task_type):
                        self.image_id = adaptation_task.image_id
                        self.task_type = resolved_task_type
                        self.device_type = adaptation_task.device_type
                        self.id = adaptation_task.id

                EvaluationService._write_model_benchmark(db, _AdaptationBenchmarkTask(task, resolved_task_type), metrics)
        except Exception as e:
            task = db.query(AdaptationTask).filter(AdaptationTask.id == task_id).first()
            if task:
                task.status = "failed"
                task.completed_at = datetime.utcnow()
                task.updated_at = datetime.utcnow()
                task.metrics = None
                task.result = {
                    "stage": "failed",
                    "success": False,
                    "message": str(e),
                }
                db.commit()
        finally:
            db.close()
