#!/usr/bin/env python3
"""
为每个芯片×每个场景组合创建镜像数据

5 个芯片 × 25 个场景 = 125 个镜像
确保每个芯片和每个子场景都有对应的镜像
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.asset import DigitalAsset, AssetType, AssetStatus, ShareScope
from app.models.user import User

# 芯片配置
CHIPS = [
    {"value": "Ascend910C", "label": "华为昇腾 910C", "framework": "MindSpore"},
    {"value": "Ascend910B", "label": "华为昇腾 910B", "framework": "MindSpore"},
    {"value": "MLU590", "label": "寒武纪 MLU590", "framework": "PyTorch"},
    {"value": "P800", "label": "昆仑芯 P800", "framework": "PaddlePaddle"},
    {"value": "BW1000", "label": "海光 DCU BW1000", "framework": "ROCm"},
]

# 25 个子场景配置
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
    """获取或创建管理员用户"""
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


def create_image_asset(db: Session, chip: dict, scenario: dict, creator_id: int) -> DigitalAsset:
    """创建镜像资产"""
    # 生成镜像名称
    image_name = f"{chip['value']}-{chip['framework']}-{scenario['model']}"
    
    # Check if already exists
    existing = db.query(DigitalAsset).filter(
        DigitalAsset.asset_type == AssetType.image,
        DigitalAsset.name == image_name
    ).first()
    
    if existing:
        return existing, False
    
    # Create new image asset
    image = DigitalAsset(
        name=image_name,
        description=f"{scenario['label']}部署镜像 - {chip['label']} + {chip['framework']} + {scenario['model']}",
        asset_type=AssetType.image,
        category=f"{scenario['label']}镜像",
        tags=[
            scenario["value"],  # task_type - 用于场景筛选
            chip["value"],      # 芯片 - 用于芯片筛选
            chip["framework"],  # 框架
            scenario["model"],  # 模型
            scenario["label"],  # 中文场景名
        ],
        version="1.0.0",
        file_path=f"/images/{image_name.lower()}.tar",
        file_size=10.0 * 1024 * 1024 * 1024,  # ~10GB
        status=AssetStatus.active,
        creator_id=creator_id,
        is_shared=True,
        share_scope=ShareScope.platform,
    )
    
    db.add(image)
    return image, True


def main():
    """主函数"""
    print("=" * 80)
    print("开始为每个芯片×场景组合创建镜像数据")
    print(f"芯片数量：{len(CHIPS)}")
    print(f"场景数量：{len(SCENARIOS)}")
    print(f"预计创建：{len(CHIPS) * len(SCENARIOS)} 个镜像")
    print("=" * 80)
    
    db = SessionLocal()
    try:
        # Get or create admin user
        admin_user = get_or_create_admin_user(db)
        print(f"\n使用管理员用户：{admin_user.username} (ID: {admin_user.id})\n")
        
        created_count = 0
        skipped_count = 0
        
        for i, chip in enumerate(CHIPS, 1):
            print(f"\n[{i}/{len(CHIPS)}] 芯片：{chip['label']}")
            print("-" * 60)
            
            for j, scenario in enumerate(SCENARIOS, 1):
                image, is_new = create_image_asset(db, chip, scenario, admin_user.id)
                
                if is_new:
                    created_count += 1
                    if created_count % 10 == 1:  # 每 10 个显示一次
                        print(f"  [{j:2d}/{len(SCENARIOS)}] ✅ {scenario['label']}: {image.name}")
                else:
                    skipped_count += 1
            
            # Commit after each chip
            db.commit()
            print(f"  → {chip['label']} 完成")
        
        print("\n" + "=" * 80)
        print("数据创建完成！")
        print("=" * 80)
        print(f"✅ 新增镜像：{created_count} 个")
        print(f"⚠️  跳过镜像：{skipped_count} 个（已存在）")
        print(f"📊 总计镜像：{created_count + skipped_count} 个")
        
        # 统计每个芯片的镜像数
        print("\n芯片分布:")
        for chip in CHIPS:
            count = db.query(DigitalAsset).filter(
                DigitalAsset.asset_type == AssetType.image,
                DigitalAsset.tags.contains([chip["value"]])
            ).count()
            print(f"  {chip['label']}: {count} 个")
        
        # 统计每个场景的镜像数
        print("\n场景分布（前 10 个）:")
        for scenario in SCENARIOS[:10]:
            count = db.query(DigitalAsset).filter(
                DigitalAsset.asset_type == AssetType.image,
                DigitalAsset.tags.contains([scenario["value"]])
            ).count()
            print(f"  {scenario['label']}: {count} 个")
        print(f"  ... (共{len(SCENARIOS)}个场景)")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ 错误：{e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        db.close()
    
    return 0


if __name__ == "__main__":
    exit(main())
