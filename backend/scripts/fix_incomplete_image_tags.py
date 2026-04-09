#!/usr/bin/env python3
"""修复不完整的模型部署镜像 tags。
目标规范：
- image name: 芯片-中间层-模型名称
- tags: [芯片, 中间层, 子场景...]

只修复当前能安全判断的缺失中间层/芯片记录。
"""

import sys
sys.path.insert(0, '/root/.openclaw/workspace/ProjectTen/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.config import settings
from app.models.asset import DigitalAsset

SCENARIOS = {
    "llm","multimodal","image_classification","object_detection","semantic_segmentation",
    "speech_recognition","speech_synthesis","ocr","image_generation","text_generation",
    "machine_translation","sentiment_analysis","question_answering","text_summarization",
    "video_understanding","recommendation","anomaly_detection","time_series",
    "reinforcement_learning","graph_neural_network","medical_imaging","autonomous_driving",
    "robot_control","code_generation","knowledge_graph"
}
MIDDLEWARES = {"MindSpore", "PyTorch", "PaddlePaddle", "ROCm", "ROCm/PyTorch", "DeepLink"}
CHIP_MAP = {
    "Ascend910C": "910C",
    "Ascend910B": "910B",
    "910C": "910C",
    "910B": "910B",
    "MLU590": "MLU590",
    "P800": "P800",
    "BW1000": "BW1000",
}
DEFAULT_MIDDLEWARE_BY_CHIP = {
    "910C": "MindSpore",
    "910B": "MindSpore",
    "MLU590": "PyTorch",
    "P800": "PaddlePaddle",
    "BW1000": "ROCm",
}


def as_list(tags):
    if isinstance(tags, list):
        return [str(t).strip() for t in tags if str(t).strip()]
    if isinstance(tags, str):
        return [t.strip() for t in tags.split(',') if t.strip()]
    return []


def norm_chip(v):
    return CHIP_MAP.get(v, v)


def fix_one(img):
    tags = as_list(img.tags)
    desc = (img.description or '').strip()
    name = (img.name or '').strip()

    chip = None
    middleware = None
    scenarios = [t for t in tags if t in SCENARIOS]

    for t in tags:
        if norm_chip(t) in CHIP_MAP.values():
            chip = norm_chip(t)
        if t in MIDDLEWARES:
            middleware = t

    if desc:
        parts = [p.strip() for p in desc.split('+') if p.strip()]
        if len(parts) >= 3:
            chip = chip or norm_chip(parts[0])
            middleware = middleware or parts[1]
            model = parts[2]
        else:
            model = None
    else:
        model = None

    if not model and name:
        parts = [p.strip() for p in name.split('-') if p.strip()]
        if len(parts) >= 3:
            if parts[0] in SCENARIOS and len(parts) >= 3:
                chip = chip or norm_chip(parts[1])
                model = '-'.join(parts[2:])
            else:
                chip = chip or norm_chip(parts[0])
                if parts[1] in MIDDLEWARES:
                    middleware = middleware or parts[1]
                    model = '-'.join(parts[2:])
                else:
                    model = '-'.join(parts[2:])
        else:
            model = name

    chip = norm_chip(chip)
    middleware = middleware or DEFAULT_MIDDLEWARE_BY_CHIP.get(chip)
    if not chip or not middleware or not scenarios or not model:
        return False, None

    new_name = f"{chip}-{middleware}-{model}"
    new_tags = [chip, middleware, *scenarios]
    new_desc = f"{chip} + {middleware} + {model}"
    return True, (new_name, new_tags, new_desc)


def main():
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as session:
        items = session.query(DigitalAsset).filter(DigitalAsset.asset_type=='image', DigitalAsset.status=='active').all()
        changed = 0
        skipped = 0
        for img in items:
            ok, payload = fix_one(img)
            if not ok:
                skipped += 1
                continue
            new_name, new_tags, new_desc = payload
            if img.name != new_name or as_list(img.tags) != new_tags or (img.description or '') != new_desc:
                print(f"FIX #{img.id}: {img.name} -> {new_name}")
                print(f"  {img.tags} -> {new_tags}")
                img.name = new_name
                img.tags = new_tags
                img.description = new_desc
                changed += 1
        session.commit()
        print(f"done changed={changed} skipped={skipped} total={len(items)}")

if __name__ == '__main__':
    main()
