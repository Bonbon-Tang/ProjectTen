#!/usr/bin/env python3
import sys
sys.path.insert(0, '/root/.openclaw/workspace/ProjectTen/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.config import settings
from app.models.asset import DigitalAsset, AssetStatus

STANDARD_CHIPS = {"910C", "910B", "MLU590", "P800", "BW1000"}
MIDDLEWARES = {"MindSpore", "PyTorch", "PaddlePaddle", "ROCm", "ROCm/PyTorch", "DeepLink"}


def is_legacy_image(asset):
    if asset.asset_type != 'image' or asset.status != AssetStatus.active:
        return False
    tags = asset.tags if isinstance(asset.tags, list) else []
    if len(tags) < 3:
        return True
    if tags[0] not in STANDARD_CHIPS:
        return True
    if tags[1] not in MIDDLEWARES:
        return True
    if asset.name.split('-')[0] not in STANDARD_CHIPS:
        return True
    return False


def main():
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as session:
        items = session.query(DigitalAsset).filter(DigitalAsset.asset_type=='image', DigitalAsset.status==AssetStatus.active).all()
        changed = 0
        for item in items:
            if is_legacy_image(item):
                print(f'PURGE #{item.id}: {item.name} {item.tags}')
                item.status = AssetStatus.deleted
                changed += 1
        session.commit()
        print(f'done purged={changed}')

if __name__ == '__main__':
    main()
