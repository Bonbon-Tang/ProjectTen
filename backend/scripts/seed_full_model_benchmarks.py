#!/usr/bin/env python3
"""Seed stable model benchmark rows for all image assets and scenario tags."""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.asset import AssetType, DigitalAsset
from app.models.model_benchmark import ModelBenchmark
from app.models.user import User
from app.services.evaluation_service import EvaluationService

DEVICE_TYPE_MAP = {
    "Ascend910C": "huawei_910c",
    "Ascend910B": "huawei_910b",
    "MLU590": "cambrian_590",
    "P800": "kunlun_p800",
    "BW1000": "hygon_bw1000",
}

FRAMEWORK_LABEL_MAP = {
    "MindSpore": "MindSpore",
    "PyTorch": "PyTorch",
    "PaddlePaddle": "PaddlePaddle",
    "ROCm": "ROCm",
    "DeepLink": "DeepLink",
}

SCENARIO_TAGS = {
    "llm", "multimodal", "speech_recognition", "image_classification", "object_detection",
    "semantic_segmentation", "text_generation", "machine_translation", "sentiment_analysis",
    "question_answering", "text_summarization", "speech_synthesis", "image_generation",
    "video_understanding", "ocr", "recommendation", "anomaly_detection", "time_series",
    "reinforcement_learning", "graph_neural_network", "medical_imaging", "autonomous_driving",
    "robot_control", "code_generation", "knowledge_graph",
}


def parse_image_meta(asset: DigitalAsset):
    tags = asset.tags or []
    chip = next((tag for tag in tags if tag in DEVICE_TYPE_MAP), None)
    framework = next((tag for tag in tags if tag in FRAMEWORK_LABEL_MAP), None)
    scenarios = [tag for tag in tags if tag in SCENARIO_TAGS]

    parts = asset.name.split("-")
    if not chip and parts:
        chip = parts[0]
    if not framework and len(parts) > 1:
        framework = parts[1]

    if framework == "DeepLink":
        model_name = "-".join(parts[2:]) if len(parts) > 2 else asset.name
    else:
        model_name = "-".join(parts[2:]) if len(parts) > 2 else asset.name

    return chip or "Ascend910C", framework or "MindSpore", model_name, scenarios


def main() -> int:
    db = SessionLocal()
    try:
        images = db.query(DigitalAsset).filter(
            DigitalAsset.asset_type == AssetType.image,
            DigitalAsset.status == "active",
        ).all()

        admin = db.query(User).filter(User.username == "admin").first()
        task_seed = 900000 + (admin.id if admin else 1)
        created = 0
        updated = 0

        for image in images:
            chip, framework, model_name, scenarios = parse_image_meta(image)
            device_type = DEVICE_TYPE_MAP.get(chip, "huawei_910c")

            for scenario in scenarios:
                metrics = EvaluationService._generate_model_metrics(scenario, image.name, device_type)
                bench = db.query(ModelBenchmark).filter(
                    ModelBenchmark.image_id == image.id,
                    ModelBenchmark.task_type == scenario,
                    ModelBenchmark.device_type == device_type,
                ).first()

                if not bench:
                    bench = ModelBenchmark(
                        image_id=image.id,
                        task_type=scenario,
                        device_type=device_type,
                        eval_method="standard",
                    )
                    created += 1
                else:
                    updated += 1

                bench.throughput = metrics.get("throughput")
                bench.throughput_unit = metrics.get("throughput_unit")
                bench.avg_latency_ms = metrics.get("avg_latency_ms")
                bench.p50_latency_ms = metrics.get("p50_latency_ms")
                bench.p99_latency_ms = metrics.get("p99_latency_ms")
                bench.first_token_latency_ms = metrics.get("first_token_latency_ms")
                bench.accuracy = metrics.get("accuracy")
                bench.accuracy_metric = metrics.get("accuracy_metric")
                bench.energy_efficiency = metrics.get("energy_efficiency")
                bench.energy_efficiency_unit = metrics.get("energy_efficiency_unit")
                bench.power_consumption_w = metrics.get("power_consumption_w")
                bench.performance_score = metrics.get("performance_score")
                bench.software_completeness_score = metrics.get("software_completeness", {}).get("score")
                bench.memory_usage_gb = metrics.get("memory_usage_gb")
                bench.image_name = image.name
                bench.chip_name = chip
                bench.framework_name = framework
                bench.model_name = model_name
                bench.task_id = task_seed + image.id
                bench.tested_at = datetime.utcnow()
                db.add(bench)

        db.commit()
        print(f"created={created}")
        print(f"updated={updated}")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
