#!/usr/bin/env python3
"""强制收敛模型部署镜像到统一规范。

最终规范：
- image name = 芯片-中间层-模型名称
- tags = [芯片, 中间层, 子场景...]

只使用标准芯片码：910C / 910B / MLU590 / P800 / BW1000
中间层白名单：MindSpore / PyTorch / PaddlePaddle / ROCm / ROCm/PyTorch / DeepLink
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
STANDARD_CHIPS = {"910C", "910B", "MLU590", "P800", "BW1000"}
MIDDLEWARES = {"MindSpore", "PyTorch", "PaddlePaddle", "ROCm", "ROCm/PyTorch", "DeepLink"}
CHIP_ALIAS = {
    "华为昇腾910C": "910C", "华为昇腾 910C": "910C", "Ascend910C": "910C", "910C": "910C",
    "华为昇腾910B": "910B", "华为昇腾 910B": "910B", "Ascend910B": "910B", "910B": "910B",
    "寒武纪MLU590": "MLU590", "寒武纪 MLU590": "MLU590", "MLU590": "MLU590",
    "昆仑芯P800": "P800", "昆仑芯 P800": "P800", "P800": "P800",
    "海光DCU BW1000": "BW1000", "海光 DCU BW1000": "BW1000", "HygonBW1000": "BW1000", "BW1000": "BW1000",
}
MIDDLEWARE_BY_CHIP = {
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


def norm_chip(value):
    if not value:
        return None
    value = str(value).strip()
    if value in CHIP_ALIAS:
        return CHIP_ALIAS[value]
    for k, v in CHIP_ALIAS.items():
        if k in value:
            return v
    return value if value in STANDARD_CHIPS else None


def extract_model(name, desc):
    name = (name or '').strip()
    desc = (desc or '').strip()
    if desc:
        parts = [p.strip() for p in desc.split('+') if p.strip()]
        if len(parts) >= 3:
            return parts[2]
    if name:
        parts = [p.strip() for p in name.split('-') if p.strip()]
        if len(parts) >= 3:
            if parts[0] in SCENARIOS:
                return '-'.join(parts[2:]).strip()
            return '-'.join(parts[2:]).strip()
    return None


def normalize_one(img):
    tags = as_list(img.tags)
    desc = (img.description or '').strip()
    name = (img.name or '').strip()

    chip = None
    middleware = None
    scenarios = []

    for t in tags:
        c = norm_chip(t)
        if c and not chip:
            chip = c
        if t in MIDDLEWARES and not middleware:
            middleware = t
        if t in SCENARIOS and t not in scenarios:
            scenarios.append(t)

    if desc:
        parts = [p.strip() for p in desc.split('+') if p.strip()]
        if len(parts) >= 3:
            chip = chip or norm_chip(parts[0])
            if not middleware and parts[1] in MIDDLEWARES:
                middleware = parts[1]

    if name and (not chip or not middleware):
        parts = [p.strip() for p in name.split('-') if p.strip()]
        if len(parts) >= 3:
            if parts[0] in SCENARIOS:
                chip = chip or norm_chip(parts[1])
            else:
                chip = chip or norm_chip(parts[0])
                if parts[1] in MIDDLEWARES:
                    middleware = middleware or parts[1]

    if chip and (not middleware or middleware == chip):
        middleware = MIDDLEWARE_BY_CHIP.get(chip)

    model = extract_model(name, desc)
    if not chip or not middleware or not scenarios or not model:
        return None

    new_name = f"{chip}-{middleware}-{model}"
    new_tags = [chip, middleware, *scenarios]
    new_desc = f"{chip} + {middleware} + {model}"
    return new_name, new_tags, new_desc


def main():
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as session:
        items = session.query(DigitalAsset).filter(DigitalAsset.asset_type=='image', DigitalAsset.status=='active').all()
        changed = 0
        skipped = 0
        for img in items:
            normalized = normalize_one(img)
            if not normalized:
                skipped += 1
                print(f"SKIP #{img.id}: {img.name} | tags={img.tags}")
                continue
            new_name, new_tags, new_desc = normalized
            if img.name != new_name or as_list(img.tags) != new_tags or (img.description or '') != new_desc:
                print(f"SPEC #{img.id}: {img.name} -> {new_name}")
                print(f"  {img.tags} -> {new_tags}")
                img.name = new_name
                img.tags = new_tags
                img.description = new_desc
                changed += 1
        session.commit()
        print(f"done changed={changed} skipped={skipped} total={len(items)}")

if __name__ == '__main__':
    main()
