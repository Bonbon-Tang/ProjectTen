from __future__ import annotations

from typing import List, Optional, Tuple

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
