from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.model_benchmark import ModelBenchmark
from app.models.asset import DigitalAsset
from app.models.user import User

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.get("/scenarios")
def get_scenarios(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all sub-scenarios that have benchmark data."""
    results = (
        db.query(ModelBenchmark.task_type, sa_func.count(ModelBenchmark.id))
        .group_by(ModelBenchmark.task_type)
        .order_by(sa_func.count(ModelBenchmark.id).desc())
        .all()
    )
    scenarios = [{"task_type": tt, "count": cnt} for tt, cnt in results]
    return _ok(scenarios)


@router.get("/ranking")
def get_ranking(
    task_type: str = Query(..., description="Sub-scenario type"),
    eval_method: str = Query("standard", description="Evaluation method"),
    sort_by: str = Query("accuracy", description="Sort field"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get model benchmark ranking for a sub-scenario, sorted by accuracy desc."""
    q = db.query(ModelBenchmark).filter(
        ModelBenchmark.task_type == task_type,
        ModelBenchmark.eval_method == eval_method,
    )
    total = q.count()

    sort_col = getattr(ModelBenchmark, sort_by, ModelBenchmark.accuracy)
    items = q.order_by(sort_col.desc().nulls_last()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for b in items:
        result.append({
            "id": b.id,
            "rank": None,  # filled below
            "image_id": b.image_id,
            "image_name": b.image_name,
            "chip_name": b.chip_name,
            "framework_name": b.framework_name,
            "model_name": b.model_name,
            "device_type": b.device_type,
            "eval_method": b.eval_method,
            "throughput": b.throughput,
            "throughput_unit": b.throughput_unit,
            "avg_latency_ms": b.avg_latency_ms,
            "p50_latency_ms": b.p50_latency_ms,
            "p99_latency_ms": b.p99_latency_ms,
            "first_token_latency_ms": b.first_token_latency_ms,
            "accuracy": b.accuracy,
            "accuracy_metric": b.accuracy_metric,
            "energy_efficiency": b.energy_efficiency,
            "energy_efficiency_unit": b.energy_efficiency_unit,
            "power_consumption_w": b.power_consumption_w,
            "performance_score": b.performance_score,
            "software_completeness_score": b.software_completeness_score,
            "memory_usage_gb": b.memory_usage_gb,
            "task_id": b.task_id,
            "tested_at": str(b.tested_at) if b.tested_at else None,
        })

    # Fill ranks
    for i, item in enumerate(result):
        item["rank"] = (page - 1) * page_size + i + 1

    return _ok({
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "task_type": task_type,
        "eval_method": eval_method,
    })


@router.get("/summary")
def get_model_benchmark_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Summary: total images tested, scenarios count, etc."""
    total = db.query(ModelBenchmark).count()
    scenarios = db.query(sa_func.count(sa_func.distinct(ModelBenchmark.task_type))).scalar() or 0
    images = db.query(sa_func.count(sa_func.distinct(ModelBenchmark.image_id))).scalar() or 0

    return _ok({
        "total_entries": total,
        "total_scenarios": scenarios,
        "total_images_tested": images,
    })


@router.get("/images")
def get_available_images(
    task_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get available images for model deployment test, optionally filtered by sub-scenario tag."""
    q = db.query(DigitalAsset).filter(
        DigitalAsset.asset_type == "image",
        DigitalAsset.status == "active",
    )
    images = q.all()

    result = []
    for img in images:
        tags = img.tags or []
        if task_type and task_type not in tags:
            continue
        result.append({
            "id": img.id,
            "name": img.name,
            "description": img.description,
            "tags": tags,
            "version": img.version,
        })

    return _ok(result)


@router.get("/toolsets")
def get_available_toolsets(
    task_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get available toolsets for model deployment test, optionally filtered by sub-scenario tag."""
    q = db.query(DigitalAsset).filter(
        DigitalAsset.asset_type == "toolset",
        DigitalAsset.status == "active",
    )
    toolsets = q.all()

    result = []
    for ts in toolsets:
        # Filter by category matching task_type (for model deployment toolsets)
        # Category should be like "LLM 测试工具", "多模态测试工具" etc.
        # Or use tags if available
        tags = ts.tags or []
        category = ts.category or ""
        
        # If task_type specified, filter toolsets that match
        if task_type:
            # Check if tags contain the task_type
            if task_type in tags:
                result.append({
                    "id": ts.id,
                    "name": ts.name,
                    "description": ts.description,
                    "category": category,
                    "tags": tags,
                })
                continue
            # Check if category matches common patterns
            task_type_labels = {
                "llm": ["LLM", "大语言模型", "文本生成"],
                "multimodal": ["多模态", "Multimodal"],
                "image_classification": ["图像分类", "Image Classification"],
                "object_detection": ["目标检测", "Object Detection"],
                "speech_recognition": ["语音识别", "Speech Recognition"],
                "ocr": ["OCR", "文字识别"],
            }
            labels = task_type_labels.get(task_type, [])
            if any(label in category for label in labels):
                result.append({
                    "id": ts.id,
                    "name": ts.name,
                    "description": ts.description,
                    "category": category,
                    "tags": tags,
                })
        else:
            result.append({
                "id": ts.id,
                "name": ts.name,
                "description": ts.description,
                "category": category,
                "tags": tags,
            })

    return _ok(result)
