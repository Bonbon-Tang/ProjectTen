from __future__ import annotations

from typing import Optional

SCENARIO_TAGS = {
    "llm",
    "multimodal",
    "image_classification",
    "object_detection",
    "semantic_segmentation",
    "speech_recognition",
    "speech_synthesis",
    "ocr",
    "image_generation",
    "text_generation",
    "machine_translation",
    "sentiment_analysis",
    "question_answering",
    "text_summarization",
    "video_understanding",
    "recommendation",
    "anomaly_detection",
    "time_series",
    "reinforcement_learning",
    "graph_neural_network",
    "medical_imaging",
    "autonomous_driving",
    "robot_control",
    "code_generation",
    "knowledge_graph",
}

DEVICE_TAG_MAP = {
    "nvidia_b200": ["nvidia_b200", "B200", "BlackwellB200"],
    "nvidia_h200": ["nvidia_h200", "H200"],
    "huawei_910c": ["huawei_910c", "910C", "Ascend910C"],
    "huawei_910b": ["huawei_910b", "910B", "Ascend910B"],
    "cambrian_590": ["cambrian_590", "MLU590", "Cambrian590"],
    "kunlun_p800": ["kunlun_p800", "P800", "KunlunP800"],
    "hygon_bw1000": ["hygon_bw1000", "BW1000", "HygonBW1000"],
}


def _ensure_list_tags(tags):
    if isinstance(tags, list):
        return [str(tag).strip() for tag in tags if str(tag).strip()]
    if isinstance(tags, str):
        return [part.strip() for part in tags.split(",") if part.strip()]
    return []


MIDDLEWARE_TAGS = {"MindSpore", "PyTorch", "PaddlePaddle", "ROCm", "ROCm/PyTorch", "DeepLink", "vllm", "sglang", "onnxruntime", "triton", "tensorrt-llm", "comfyui", "deepspeed", "ray", "dgl", "monai", "ros2"}
CHIP_TAGS = {"nvidia_b200", "nvidia_h200", "huawei_910c", "huawei_910b", "cambrian_590", "kunlun_p800", "hygon_bw1000", "B200", "H200", "910C", "910B", "MLU590", "P800", "BW1000", "Ascend910C", "Ascend910B", "HygonBW1000", "KunlunP800", "Cambrian590", "BlackwellB200"}
CHIP_NORMALIZE_MAP = {
    "B200": "nvidia_b200",
    "BlackwellB200": "nvidia_b200",
    "H200": "nvidia_h200",
    "Ascend910C": "huawei_910c",
    "910C": "huawei_910c",
    "Ascend910B": "huawei_910b",
    "910B": "huawei_910b",
    "HygonBW1000": "hygon_bw1000",
    "BW1000": "hygon_bw1000",
    "KunlunP800": "kunlun_p800",
    "P800": "kunlun_p800",
    "Cambrian590": "cambrian_590",
    "MLU590": "cambrian_590",
}


def _normalize_chip_tag(tag: Optional[str]):
    if not tag:
        return tag
    return CHIP_NORMALIZE_MAP.get(tag, tag)


def _extract_tag_parts(tags: list[str]):
    chip = None
    middleware = None
    scenarios = []
    model = None
    for tag in tags:
        normalized_chip = _normalize_chip_tag(tag)
        if not chip and normalized_chip in CHIP_TAGS:
            chip = normalized_chip
            continue
        if not middleware and tag in MIDDLEWARE_TAGS:
            middleware = tag
            continue
        if tag in SCENARIO_TAGS:
            scenarios.append(tag)
            continue
        if not model:
            model = tag
    return chip, middleware, scenarios, model


def _infer_chip_framework_model(img: DigitalAsset, tags: list[str]):
    description = (img.description or "").strip()
    name = (img.name or "").strip()
    chip_name, framework_name, _, model_tag = _extract_tag_parts(tags)
    model_name = None

    if name:
        underscore_parts = [part.strip() for part in name.split("_") if part.strip()]
        dash_parts = [part.strip() for part in name.split("-") if part.strip()]
        if len(underscore_parts) >= 3:
            model_name = "_".join(underscore_parts[2:]).strip()
        elif len(dash_parts) >= 3:
            model_name = "-".join(dash_parts[2:]).strip()
        elif len(underscore_parts) >= 1:
            model_name = underscore_parts[-1].strip()
        elif len(dash_parts) >= 1:
            model_name = dash_parts[-1].strip()

    if description:
        desc_parts = [part.strip() for part in description.replace("_", "+").split("+") if part.strip()]
        if len(desc_parts) >= 3:
            chip_name = chip_name or _normalize_chip_tag(desc_parts[0])
            framework_name = framework_name or desc_parts[1]
            model_name = model_name or desc_parts[2]

    return chip_name, framework_name, model_tag or model_name or name

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
    scenarios = [{"scenario": tt, "count": cnt} for tt, cnt in results]
    return _ok(scenarios)


@router.get("/ranking")
def get_ranking(
    scenario: Optional[str] = Query(None, description="Unified v2 scenario"),
    task_type: Optional[str] = Query(None, description="Legacy sub-scenario type"),
    eval_method: str = Query("standard", description="Evaluation method"),
    sort_by: str = Query("ranking_score", description="Sort field"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get model benchmark ranking for a sub-scenario, sorted by accuracy desc."""
    resolved_scenario = scenario or task_type
    q = db.query(ModelBenchmark).filter(
        ModelBenchmark.task_type == resolved_scenario,
        ModelBenchmark.eval_method == eval_method,
    )
    total = q.count()

    if sort_by == "ranking_score":
        all_items = q.all()

        def _ranking_score(item: ModelBenchmark) -> float:
            throughput = item.throughput or 0.0
            accuracy = item.accuracy or 0.0
            latency = item.avg_latency_ms or 9999.0
            energy = item.energy_efficiency or 0.0
            perf = item.performance_score or 0.0
            software = item.software_completeness_score or 0.0
            latency_score = max(0.0, 120.0 - latency * 2.1)
            return round(
                perf * 0.28 + accuracy * 0.24 + min(throughput / 12.0, 120.0) * 0.18 +
                min(energy / 4.5, 120.0) * 0.12 + software * 0.10 + latency_score * 0.08,
                2,
            )

        scored = sorted(all_items, key=_ranking_score, reverse=True)
        total = len(scored)
        items = scored[(page - 1) * page_size: page * page_size]
    else:
        sort_col = getattr(ModelBenchmark, sort_by, ModelBenchmark.accuracy)
        items = q.order_by(sort_col.desc().nulls_last()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for b in items:
        ranking_score = None
        if sort_by == "ranking_score":
            throughput = b.throughput or 0.0
            accuracy = b.accuracy or 0.0
            latency = b.avg_latency_ms or 9999.0
            energy = b.energy_efficiency or 0.0
            perf = b.performance_score or 0.0
            software = b.software_completeness_score or 0.0
            latency_score = max(0.0, 120.0 - latency * 2.1)
            ranking_score = round(
                perf * 0.28 + accuracy * 0.24 + min(throughput / 12.0, 120.0) * 0.18 +
                min(energy / 4.5, 120.0) * 0.12 + software * 0.10 + latency_score * 0.08,
                2,
            )
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
            "ranking_score": ranking_score,
        })

    # Fill ranks
    for i, item in enumerate(result):
        item["rank"] = (page - 1) * page_size + i + 1

    return _ok({
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "scenario": resolved_scenario,
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
    scenario: Optional[str] = None,
    chips: Optional[str] = None,
    task_type: Optional[str] = None,
    device_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get available images for model deployment test, optionally filtered by unified v2 scenario/chips."""
    resolved_scenario = scenario or task_type
    resolved_chips = chips or device_type
    target_chip_tags = set(DEVICE_TAG_MAP.get(resolved_chips, [])) if resolved_chips else set()

    q = db.query(DigitalAsset).filter(
        DigitalAsset.asset_type == "image",
        DigitalAsset.status == "active",
    )
    images = q.all()

    grouped = {}
    for img in images:
        tags = _ensure_list_tags(img.tags)
        if resolved_scenario and resolved_scenario not in tags:
            continue

        chip_name, framework_name, model_name = _infer_chip_framework_model(img, tags)
        tag_chip, tag_middleware, scenario_tags, model_tag = _extract_tag_parts(tags)
        if not tag_chip or not tag_middleware or not scenario_tags:
            continue
        if target_chip_tags:
            normalized_target = {_normalize_chip_tag(tag) for tag in target_chip_tags}
            if tag_chip not in normalized_target:
                continue

        final_model = model_tag or model_name or f"{scenario_tags[0]}_base"
        item = {
            "id": img.id,
            "asset_code": img.asset_code,
            "name": img.name,
            "description": img.description,
            "tags": [tag_chip, tag_middleware, scenario_tags[0], final_model],
            "version": img.version,
            "chip_name": chip_name or tag_chip,
            "framework_name": framework_name or tag_middleware,
            "middleware_name": tag_middleware,
            "model_name": final_model,
            "scenario_tags": scenario_tags,
        }
        group_key = (tag_chip, tag_middleware, scenario_tags[0], final_model)
        existing = grouped.get(group_key)
        if not existing or img.id > existing["id"]:
            grouped[group_key] = item

    result = sorted(grouped.values(), key=lambda x: x["id"])
    return _ok(result)


@router.get("/toolsets")
def get_available_toolsets(
    scenario: Optional[str] = None,
    task_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get available toolsets for model deployment test, optionally filtered by unified v2 scenario."""
    resolved_scenario = scenario or task_type
    q = db.query(DigitalAsset).filter(
        DigitalAsset.asset_type == "toolset",
        DigitalAsset.status == "active",
    )
    toolsets = q.all()

    result = []
    for ts in toolsets:
        tags = _ensure_list_tags(ts.tags)
        category = ts.category or ""
        if resolved_scenario and resolved_scenario not in tags:
            continue
        result.append({
            "id": ts.id,
            "asset_code": ts.asset_code,
            "name": ts.name,
            "description": ts.description,
            "category": category,
            "tags": tags,
        })

    return _ok(result)
