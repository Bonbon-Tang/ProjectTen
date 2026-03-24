#!/usr/bin/env python3
"""Recompute model benchmark rows using stable deterministic metrics."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.model_benchmark import ModelBenchmark
from app.services.evaluation_service import EvaluationService


def main() -> int:
    db = SessionLocal()
    try:
        items = db.query(ModelBenchmark).all()
        updated = 0
        for item in items:
            image_name = item.image_name or item.model_name or ""
            metrics = EvaluationService._generate_model_metrics(
                item.task_type,
                image_name,
                item.device_type or "",
            )
            item.throughput = metrics.get("throughput")
            item.throughput_unit = metrics.get("throughput_unit")
            item.avg_latency_ms = metrics.get("avg_latency_ms")
            item.p50_latency_ms = metrics.get("p50_latency_ms")
            item.p99_latency_ms = metrics.get("p99_latency_ms")
            item.first_token_latency_ms = metrics.get("first_token_latency_ms")
            item.accuracy = metrics.get("accuracy")
            item.accuracy_metric = metrics.get("accuracy_metric")
            item.energy_efficiency = metrics.get("energy_efficiency")
            item.energy_efficiency_unit = metrics.get("energy_efficiency_unit")
            item.power_consumption_w = metrics.get("power_consumption_w")
            item.performance_score = metrics.get("performance_score")
            item.software_completeness_score = metrics.get("software_completeness", {}).get("score")
            item.memory_usage_gb = metrics.get("memory_usage_gb")
            updated += 1

        db.commit()
        print(f"updated_model_benchmarks={updated}")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"error={exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
