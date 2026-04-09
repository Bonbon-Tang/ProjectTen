#!/usr/bin/env python3
"""清理重复/旧格式模型镜像，优先保留规范版。"""
import sys
sys.path.insert(0, '/root/.openclaw/workspace/ProjectTen/backend')

from collections import defaultdict
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.config import settings
from app.models.asset import DigitalAsset, AssetStatus

STANDARD_CHIPS = {"910C", "910B", "MLU590", "P800", "BW1000"}
MIDDLEWARES = {"MindSpore", "PyTorch", "PaddlePaddle", "ROCm", "ROCm/PyTorch", "DeepLink"}
SCENARIOS = {
    "llm", "multimodal", "image_classification", "object_detection", "semantic_segmentation",
    "speech_recognition", "speech_synthesis", "ocr", "image_generation", "text_generation",
    "machine_translation", "sentiment_analysis", "question_answering", "text_summarization",
    "video_understanding", "recommendation", "anomaly_detection", "time_series",
    "reinforcement_learning", "graph_neural_network", "medical_imaging", "autonomous_driving",
    "robot_control", "code_generation", "knowledge_graph",
}

def score(asset):
    tags = asset.tags if isinstance(asset.tags, list) else []
    s = 0
    if tags and tags[0] in STANDARD_CHIPS:
        s += 3
    if len(tags) > 1 and tags[1] in MIDDLEWARES:
        s += 3
    s += sum(1 for t in tags if t in SCENARIOS)
    if asset.name and asset.name.split('-')[0] in STANDARD_CHIPS:
        s += 2
    return s


def canonical_key(asset):
    tags = asset.tags if isinstance(asset.tags, list) else []
    if len(tags) >= 2 and tags[0] in STANDARD_CHIPS and tags[1] in MIDDLEWARES:
        return asset.name
    desc = (asset.description or '').replace(' ', '')
    return desc or asset.name


def main():
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as session:
        items = session.query(DigitalAsset).filter(DigitalAsset.asset_type=='image', DigitalAsset.status==AssetStatus.active).all()
        groups = defaultdict(list)
        for item in items:
            groups[canonical_key(item)].append(item)
        deleted = 0
        for key, group in groups.items():
            if len(group) <= 1:
                continue
            keep = sorted(group, key=lambda x: (score(x), -x.id), reverse=True)[0]
            for item in group:
                if item.id == keep.id:
                    continue
                print(f'DELETE duplicate #{item.id} keep=#{keep.id} name={item.name}')
                item.status = AssetStatus.deleted
                deleted += 1
        session.commit()
        print(f'done deleted={deleted}')

if __name__ == '__main__':
    main()
