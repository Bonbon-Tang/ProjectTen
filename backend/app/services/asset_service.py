from __future__ import annotations

from typing import List, Optional, Tuple

SCENARIO_TAGS = {
    "llm", "multimodal", "image_classification", "object_detection", "semantic_segmentation",
    "speech_recognition", "speech_synthesis", "ocr", "image_generation", "text_generation",
    "machine_translation", "sentiment_analysis", "question_answering", "text_summarization",
    "video_understanding", "recommendation", "anomaly_detection", "time_series",
    "reinforcement_learning", "graph_neural_network", "medical_imaging", "autonomous_driving",
    "robot_control", "code_generation", "knowledge_graph",
}
CHIP_ALIAS = {
    "华为昇腾910C": "huawei_910c", "华为昇腾 910C": "huawei_910c", "Ascend910C": "huawei_910c", "910C": "huawei_910c", "huawei_910c": "huawei_910c",
    "华为昇腾910B": "huawei_910b", "华为昇腾 910B": "huawei_910b", "Ascend910B": "huawei_910b", "910B": "huawei_910b", "huawei_910b": "huawei_910b",
    "寒武纪MLU590": "cambrian_590", "寒武纪 MLU590": "cambrian_590", "MLU590": "cambrian_590", "cambrian_590": "cambrian_590",
    "昆仑芯P800": "kunlun_p800", "昆仑芯 P800": "kunlun_p800", "P800": "kunlun_p800", "kunlun_p800": "kunlun_p800",
    "海光DCU BW1000": "hygon_bw1000", "海光 DCU BW1000": "hygon_bw1000", "HygonBW1000": "hygon_bw1000", "BW1000": "hygon_bw1000", "hygon_bw1000": "hygon_bw1000",
    "英伟达H200": "nvidia_h200", "英伟达 H200": "nvidia_h200", "H200": "nvidia_h200", "nvidia_h200": "nvidia_h200",
}
MIDDLEWARE_TAGS = {"MindSpore", "PyTorch", "PaddlePaddle", "ROCm", "ROCm/PyTorch", "DeepLink", "vllm", "sglang", "onnxruntime", "triton", "tensorrt-llm", "comfyui", "deepspeed", "ray", "dgl", "monai", "ros2"}


def _normalize_chip(tag: Optional[str]) -> Optional[str]:
    if not tag:
        return None
    return CHIP_ALIAS.get(tag, tag)


def _normalize_image_asset(asset: DigitalAsset) -> DigitalAsset:
    if asset.asset_type != AssetType.image:
        return asset
    tags = asset.tags if isinstance(asset.tags, list) else []
    chip = None
    middleware = None
    scenarios = []
    model = None
    for tag in tags:
        normalized = _normalize_chip(tag)
        if not chip and normalized in {"nvidia_h200", "huawei_910c", "huawei_910b", "cambrian_590", "kunlun_p800", "hygon_bw1000"}:
            chip = normalized
            continue
        if not middleware and tag in MIDDLEWARE_TAGS:
            middleware = tag
            continue
        if tag in SCENARIO_TAGS and tag not in scenarios:
            scenarios.append(tag)
            continue
        if not model:
            model = tag
    if chip and middleware and scenarios:
        asset.tags = [chip, middleware, scenarios[0], model or scenarios[0]]
    return asset

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.asset import DigitalAsset, AssetType, AssetStatus, ShareScope
from app.utils.pagination import PaginationParams


class AssetService:

    @staticmethod
    def upload(db: Session, *, creator_id: int, tenant_id: Optional[int] = None, **kwargs) -> DigitalAsset:
        asset = DigitalAsset(
            name=kwargs["name"],
            description=kwargs.get("description"),
            asset_type=AssetType(kwargs["asset_type"]),
            category=kwargs.get("category"),
            tags=kwargs.get("tags", []),
            version=kwargs.get("version", "1.0.0"),
            file_path=kwargs.get("file_path"),
            file_size=kwargs.get("file_size", 0.0),
            creator_id=creator_id,
            tenant_id=tenant_id,
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    @staticmethod
    def list_assets(
        db: Session,
        pagination: PaginationParams,
        *,
        asset_type: Optional[str] = None,
        category: Optional[str] = None,
        keyword: Optional[str] = None,
        creator_id: Optional[int] = None,
        tenant_id: Optional[int] = None,
    ) -> Tuple[List[DigitalAsset], int]:
        q = db.query(DigitalAsset).filter(DigitalAsset.status != AssetStatus.deleted)
        if asset_type:
            q = q.filter(DigitalAsset.asset_type == asset_type)
        if category:
            q = q.filter(DigitalAsset.category == category)
        if keyword:
            kw = keyword.strip()
            lowered_kw = kw.lower()
            q = q.filter(
                or_(
                    func.lower(DigitalAsset.name) == lowered_kw,
                    DigitalAsset.name.ilike(f"%{kw}%"),
                    func.coalesce(DigitalAsset.description, "").ilike(f"%{kw}%"),
                )
            )
        if creator_id:
            q = q.filter(DigitalAsset.creator_id == creator_id)
        if tenant_id:
            q = q.filter(DigitalAsset.tenant_id == tenant_id)
        total = q.count()
        items = q.order_by(DigitalAsset.created_at.desc()).offset(pagination.offset).limit(pagination.limit).all()
        items = [_normalize_image_asset(item) for item in items]
        return items, total

    @staticmethod
    def get_by_id(db: Session, asset_id: int) -> Optional[DigitalAsset]:
        return db.query(DigitalAsset).filter(DigitalAsset.id == asset_id).first()

    @staticmethod
    def update(db: Session, asset: DigitalAsset, **kwargs) -> DigitalAsset:
        for k, v in kwargs.items():
            if v is not None and hasattr(asset, k):
                setattr(asset, k, v)
        db.commit()
        db.refresh(asset)
        return asset

    @staticmethod
    def delete(db: Session, asset: DigitalAsset) -> None:
        asset.status = AssetStatus.deleted
        db.commit()

    @staticmethod
    def share(db: Session, asset: DigitalAsset, *, is_shared: bool, share_scope: str) -> DigitalAsset:
        asset.is_shared = is_shared
        asset.share_scope = ShareScope(share_scope)
        db.commit()
        db.refresh(asset)
        return asset

    @staticmethod
    def get_versions(db: Session, asset: DigitalAsset) -> List[DigitalAsset]:
        """Get all versions of an asset by name."""
        return (
            db.query(DigitalAsset)
            .filter(DigitalAsset.name == asset.name, DigitalAsset.creator_id == asset.creator_id)
            .order_by(DigitalAsset.created_at.desc())
            .all()
        )
