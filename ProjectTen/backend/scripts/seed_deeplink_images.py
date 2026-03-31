#!/usr/bin/env python3
"""
为 3 个芯片 × 25 个子场景追加 DeepLink 中间层镜像。

新增规则：
- 芯片：Ascend910C / Ascend910B / MLU590
- 每个子场景新增 1 个 DeepLink 镜像
- 总计：3 * 25 = 75 个镜像
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.asset import AssetStatus, AssetType, DigitalAsset, ShareScope
from app.models.user import User

CHIPS = [
    {"value": "Ascend910C", "label": "华为昇腾 910C"},
    {"value": "Ascend910B", "label": "华为昇腾 910B"},
    {"value": "MLU590", "label": "寒武纪 MLU590"},
]

SCENARIOS = [
    {"value": "llm", "label": "大语言模型", "model": "Qwen2-7B"},
    {"value": "multimodal", "label": "多模态", "model": "InternVL2-8B"},
    {"value": "speech_recognition", "label": "语音识别", "model": "Paraformer"},
    {"value": "image_classification", "label": "图像分类", "model": "ResNet50"},
    {"value": "object_detection", "label": "目标检测", "model": "YOLOv8"},
    {"value": "semantic_segmentation", "label": "语义分割", "model": "DeepLabV3"},
    {"value": "text_generation", "label": "文本生成", "model": "LLaMA3-8B"},
    {"value": "machine_translation", "label": "机器翻译", "model": "NMT-Transformer"},
    {"value": "sentiment_analysis", "label": "情感分析", "model": "ERNIE-Bot"},
    {"value": "question_answering", "label": "问答系统", "model": "Qwen-7B-Chat"},
    {"value": "text_summarization", "label": "文本摘要", "model": "BART-Base"},
    {"value": "speech_synthesis", "label": "语音合成", "model": "VITS"},
    {"value": "image_generation", "label": "图像生成", "model": "SDXL-Turbo"},
    {"value": "video_understanding", "label": "视频理解", "model": "VideoMAE"},
    {"value": "ocr", "label": "文字识别 (OCR)", "model": "PaddleOCR"},
    {"value": "recommendation", "label": "推荐系统", "model": "DeepFM"},
    {"value": "anomaly_detection", "label": "异常检测", "model": "AutoEncoder"},
    {"value": "time_series", "label": "时序预测", "model": "Informer"},
    {"value": "reinforcement_learning", "label": "强化学习", "model": "PPO-Agent"},
    {"value": "graph_neural_network", "label": "图神经网络", "model": "GAT"},
    {"value": "medical_imaging", "label": "医学影像", "model": "3D-UNet"},
    {"value": "autonomous_driving", "label": "自动驾驶", "model": "Apollo-Perception"},
    {"value": "robot_control", "label": "机器人控制", "model": "RL-Control"},
    {"value": "code_generation", "label": "代码生成", "model": "CodeQwen-7B"},
    {"value": "knowledge_graph", "label": "知识图谱", "model": "KG-BERT"},
]


def get_or_create_admin_user(db: Session) -> User:
    user = db.query(User).filter(User.username == "admin").first()
    if not user:
        user = User(
            username="admin",
            email="admin@agi4sci.com",
            role="admin",
            user_type="admin",
            tenant_id=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def build_image_name(chip_value: str, model_name: str) -> str:
    return f"{chip_value}-DeepLink-{model_name}"


def create_image_asset(db: Session, chip: dict, scenario: dict, creator_id: int):
    image_name = build_image_name(chip["value"], scenario["model"])
    existing = db.query(DigitalAsset).filter(
        DigitalAsset.asset_type == AssetType.image,
        DigitalAsset.name == image_name,
    ).first()
    if existing:
        return False

    image = DigitalAsset(
        name=image_name,
        description=f"{scenario['label']}部署镜像 - {chip['label']} + DeepLink + {scenario['model']}",
        asset_type=AssetType.image,
        category=f"{scenario['label']}镜像",
        tags=[
            scenario["value"],
            chip["value"],
            "DeepLink",
            scenario["model"],
            scenario["label"],
        ],
        version="1.0.0",
        file_path=f"/images/{image_name.lower()}.tar",
        file_size=10.0 * 1024 * 1024 * 1024,
        status=AssetStatus.active,
        creator_id=creator_id,
        is_shared=True,
        share_scope=ShareScope.platform,
    )
    db.add(image)
    return True


def main() -> int:
    print("=" * 72)
    print("开始追加 DeepLink 镜像")
    print(f"芯片数量：{len(CHIPS)}")
    print(f"场景数量：{len(SCENARIOS)}")
    print(f"预计新增：{len(CHIPS) * len(SCENARIOS)} 个镜像")
    print("=" * 72)

    db = SessionLocal()
    try:
        admin_user = get_or_create_admin_user(db)
        created = 0
        skipped = 0

        for chip in CHIPS:
            print(f"\n芯片：{chip['label']}")
            for scenario in SCENARIOS:
                is_new = create_image_asset(db, chip, scenario, admin_user.id)
                if is_new:
                    created += 1
                else:
                    skipped += 1
            db.commit()

        print("\n" + "=" * 72)
        print("追加完成")
        print("=" * 72)
        print(f"新增镜像：{created} 个")
        print(f"跳过镜像：{skipped} 个（已存在）")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"❌ 错误：{exc}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
