from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict


def _candidate_paths() -> list[Path]:
    backend_root = Path(__file__).resolve().parents[2]
    project_root = backend_root.parent
    configured = os.getenv("AIBENCH_ASSETS_CONFIG")
    paths = []
    if configured:
        paths.append(Path(configured))
    paths.extend(
        [
            backend_root / "config" / "projectten_assets.local.json",
            project_root.parent / "AIBenchAgent" / "config" / "projectten_assets.local.json",
        ]
    )
    return paths


def load_aibench_image_catalog() -> Dict[str, Dict[str, Any]]:
    for config_path in _candidate_paths():
        if not config_path.exists():
            continue
        try:
            with config_path.open(encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, json.JSONDecodeError):
            continue
        images = payload.get("images", {})
        if isinstance(images, dict):
            return images
    return {}
