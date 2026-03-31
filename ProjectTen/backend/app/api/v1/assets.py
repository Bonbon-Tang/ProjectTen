from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_permissions, write_audit_log
from app.models.user import User
from app.schemas.asset import AssetOut, AssetShare, AssetUpdate, AssetUpload
from app.services.asset_service import AssetService
from app.utils.pagination import PaginationParams, paginate

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.post("/upload")
def upload_asset(body: AssetUpload, request: Request,
                 current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    asset = AssetService.upload(
        db,
        creator_id=current_user.id,
        tenant_id=current_user.tenant_id,
        **body.model_dump(),
    )

    write_audit_log(db, user_id=current_user.id, action="upload_asset", resource_type="asset",
                    resource_id=asset.id, ip_address=request.client.host if request.client else None)
    return _ok(AssetOut.model_validate(asset).model_dump())


@router.get("/")
@router.get("")
def list_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    asset_type: Optional[str] = None,
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page, page_size)
    assets, total = AssetService.list_assets(
        db, pagination, asset_type=asset_type, category=category, keyword=keyword,
    )
    items = [AssetOut.model_validate(a).model_dump() for a in assets]
    return _ok(paginate(items, total, page, page_size))


@router.get("/{asset_id}")
def get_asset(asset_id: int, current_user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    asset = AssetService.get_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return _ok(AssetOut.model_validate(asset).model_dump())


@router.put("/{asset_id}")
def update_asset(asset_id: int, body: AssetUpdate, request: Request,
                 current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    asset = AssetService.get_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    updates = body.model_dump(exclude_unset=True)
    asset = AssetService.update(db, asset, **updates)

    write_audit_log(db, user_id=current_user.id, action="update_asset", resource_type="asset",
                    resource_id=asset_id, details=updates,
                    ip_address=request.client.host if request.client else None)
    return _ok(AssetOut.model_validate(asset).model_dump())


@router.delete("/{asset_id}")
def delete_asset(asset_id: int, request: Request,
                 current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    asset = AssetService.get_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    AssetService.delete(db, asset)

    write_audit_log(db, user_id=current_user.id, action="delete_asset", resource_type="asset",
                    resource_id=asset_id, ip_address=request.client.host if request.client else None)
    return _ok(message="Asset deleted")


@router.post("/{asset_id}/share")
def share_asset(asset_id: int, body: AssetShare, request: Request,
                current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    asset = AssetService.get_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = AssetService.share(db, asset, is_shared=body.is_shared, share_scope=body.share_scope)

    write_audit_log(db, user_id=current_user.id, action="share_asset", resource_type="asset",
                    resource_id=asset_id, details=body.model_dump(),
                    ip_address=request.client.host if request.client else None)
    return _ok(AssetOut.model_validate(asset).model_dump())


@router.get("/{asset_id}/versions")
def list_asset_versions(asset_id: int, current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    asset = AssetService.get_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    versions = AssetService.get_versions(db, asset)
    items = [AssetOut.model_validate(a).model_dump() for a in versions]
    return _ok(items)
