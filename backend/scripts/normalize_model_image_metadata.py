#!/usr/bin/env python3
"""
统一梳理模型部署镜像：
1. name = 芯片-中间层-模型名（整个 image 名字）
2. tags = [芯片, 中间层, 子场景...]

示例：
  name: 910C-MindSpore-Qwen2-72B
  tags: ["910C", "MindSpore", "llm", "text_generation"]
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.config import settings
from app.models.asset import DigitalAsset

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

CHIP_ALIAS = {
    "华为昇腾910C": "910C",
    "华为昇腾 910C": "910C",
    "Ascend910C": "910C",
    "910C": "910C",
    "华为昇腾910B": "910B",
    "华为昇腾 910B": "910B",
    "Ascend910B": "910B",
    "910B": "910B",
    "寒武纪MLU590": "MLU590",
    "寒武纪 MLU590": "MLU590",
    "MLU590": "MLU590",
    "昆仑芯P800": "P800",
    "昆仑芯 P800": "P800",
    "P800": "P800",
    "海光DCU BW1000": "BW1000",
    "海光 DCU BW1000": "BW1000",
    "HygonBW1000": "BW1000",
    "BW1000": "BW1000",
}

MIDDLEWARE_SET = {
    "MindSpore",
    "PyTorch",
    "PaddlePaddle",
    "ROCm",
    "ROCm/PyTorch",
    "DeepLink",
}


def to_list(tags):
    if isinstance(tags, list):
        return [str(x).strip() for x in tags if str(x).strip()]
    if isinstance(tags, str):
        return [x.strip() for x in tags.split(",") if x.strip()]
    return []


def normalize_chip(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    if value in CHIP_ALIAS:
        return CHIP_ALIAS[value]
    for k, v in CHIP_ALIAS.items():
        if k in value:
            return v
    return value


def parse_asset(img: DigitalAsset):
    tags = to_list(img.tags)
    desc = (img.description or "").strip()
    name = (img.name or "").strip()

    chip = None
    middleware = None
    model = None
    scenarios = [t for t in tags if t in SCENARIO_TAGS]

    for tag in tags:
        if not chip:
            normalized_chip = normalize_chip(tag)
            if normalized_chip and normalized_chip != tag or tag in CHIP_ALIAS.values():
                chip = normalized_chip
                continue
        if not middleware and tag in MIDDLEWARE_SET:
            middleware = tag
            continue

    non_cn_tags = [t for t in tags if t and all(ord(ch) < 128 for ch in t)]
    candidate_model_tags = [
        t for t in non_cn_tags
        if t not in SCENARIO_TAGS and t not in MIDDLEWARE_SET and normalize_chip(t) not in CHIP_ALIAS.values()
    ]
    if candidate_model_tags:
        model = candidate_model_tags[-1]

    if desc:
        parts = [p.strip() for p in desc.split("+") if p.strip()]
        if len(parts) >= 3:
            chip = chip or normalize_chip(parts[0])
            middleware = middleware or parts[1]
            model = model or parts[2]

    if name:
        name_parts = [p.strip() for p in name.split("-") if p.strip()]
        if len(name_parts) >= 3:
            maybe_chip = normalize_chip(name_parts[0])
            maybe_middleware = name_parts[1]
            if maybe_chip in CHIP_ALIAS.values() and maybe_middleware in MIDDLEWARE_SET:
                chip = chip or maybe_chip
                middleware = middleware or maybe_middleware
                model = model or "-".join(name_parts[2:]).strip()
            elif name_parts[0] in SCENARIO_TAGS and len(name_parts) >= 4:
                chip = chip or normalize_chip(name_parts[1])
                middleware = middleware or name_parts[2]
                model = model or "-".join(name_parts[3:]).strip()

    model = model or name or f"image-{img.id}"
    chip = chip or "UNKNOWN_CHIP"
    middleware = middleware or "UNKNOWN_MIDDLEWARE"

    new_name = f"{chip}-{middleware}-{model}"
    new_tags = [chip, middleware, *scenarios]

    deduped = []
    seen = set()
    for tag in new_tags:
        if tag and tag not in seen:
            deduped.append(tag)
            seen.add(tag)

    return new_name, deduped, chip, middleware, model


def main():
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as session:
        images = session.query(DigitalAsset).filter(DigitalAsset.asset_type == "image").all()
        changed = 0
        for img in images:
            new_name, new_tags, chip, middleware, model = parse_asset(img)
            new_desc = f"{chip} + {middleware} + {model}"
            if img.name != new_name or to_list(img.tags) != new_tags or (img.description or "") != new_desc:
                print(f"UPDATE #{img.id}: {img.name} -> {new_name}")
                print(f"  tags: {img.tags} -> {new_tags}")
                img.name = new_name
                img.tags = new_tags
                img.description = new_desc
                changed += 1
        session.commit()
        print(f"done, changed={changed}, total={len(images)}")


if __name__ == "__main__":
    main()
