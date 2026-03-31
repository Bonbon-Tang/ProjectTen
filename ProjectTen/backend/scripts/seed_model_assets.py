#!/usr/bin/env python3
"""
为 25 个模型部署子场景批量创建镜像和工具集数据

每个子场景将创建：
- 1 个模型部署镜像（asset_type='image'）
- 1 个评测工具集（asset_type='toolset'）

所有资产的 tags 都会包含对应的 task_type，确保前端过滤逻辑正常工作。
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.asset import DigitalAsset, AssetType, AssetStatus, ShareScope
from app.models.user import User

# 25 个模型部署子场景配置
SCENARIOS = [
    {
        "task_type": "llm",
        "label": "大语言模型",
        "chip": "Ascend910C",
        "framework": "MindSpore",
        "model": "Qwen2-72B",
        "image_name": "Ascend910C-MindSpore-Qwen2-72B",
        "toolset_name": "LLM 性能评测工具",
    },
    {
        "task_type": "multimodal",
        "label": "多模态模型",
        "chip": "Ascend910C",
        "framework": "MindSpore",
        "model": "InternVL2-26B",
        "image_name": "Ascend910C-MindSpore-InternVL2-26B",
        "toolset_name": "多模态模型评测工具",
    },
    {
        "task_type": "speech_recognition",
        "label": "语音识别",
        "chip": "Ascend910B",
        "framework": "MindSpore",
        "model": "Paraformer",
        "image_name": "Ascend910B-MindSpore-Paraformer",
        "toolset_name": "语音识别评测工具",
    },
    {
        "task_type": "image_classification",
        "label": "图像分类",
        "chip": "MLU590",
        "framework": "PyTorch",
        "model": "ResNet152",
        "image_name": "MLU590-PyTorch-ResNet152",
        "toolset_name": "图像分类评测工具",
    },
    {
        "task_type": "object_detection",
        "label": "目标检测",
        "chip": "Ascend910C",
        "framework": "MindSpore",
        "model": "YOLOv8",
        "image_name": "Ascend910C-MindSpore-YOLOv8",
        "toolset_name": "目标检测评测工具",
    },
    {
        "task_type": "semantic_segmentation",
        "label": "语义分割",
        "chip": "MLU590",
        "framework": "PyTorch",
        "model": "DeepLabV3",
        "image_name": "MLU590-PyTorch-DeepLabV3",
        "toolset_name": "语义分割评测工具",
    },
    {
        "task_type": "text_generation",
        "label": "文本生成",
        "chip": "Ascend910C",
        "framework": "PyTorch",
        "model": "LLaMA3-70B",
        "image_name": "Ascend910C-PyTorch-LLaMA3-70B",
        "toolset_name": "文本生成评测工具",
    },
    {
        "task_type": "machine_translation",
        "label": "机器翻译",
        "chip": "Ascend910B",
        "framework": "MindSpore",
        "model": "NMT-Transformer",
        "image_name": "Ascend910B-MindSpore-NMT-Transformer",
        "toolset_name": "机器翻译评测工具",
    },
    {
        "task_type": "sentiment_analysis",
        "label": "情感分析",
        "chip": "P800",
        "framework": "PaddlePaddle",
        "model": "ERNIE-Bot",
        "image_name": "P800-PaddlePaddle-ERNIE-Bot",
        "toolset_name": "情感分析评测工具",
    },
    {
        "task_type": "question_answering",
        "label": "问答系统",
        "chip": "Ascend910C",
        "framework": "MindSpore",
        "model": "Qwen-72B-Chat",
        "image_name": "Ascend910C-MindSpore-Qwen-72B-Chat",
        "toolset_name": "问答系统评测工具",
    },
    {
        "task_type": "text_summarization",
        "label": "文本摘要",
        "chip": "Ascend910B",
        "framework": "PyTorch",
        "model": "BART-Large",
        "image_name": "Ascend910B-PyTorch-BART-Large",
        "toolset_name": "文本摘要评测工具",
    },
    {
        "task_type": "speech_synthesis",
        "label": "语音合成",
        "chip": "MLU590",
        "framework": "PyTorch",
        "model": "VITS",
        "image_name": "MLU590-PyTorch-VITS",
        "toolset_name": "语音合成评测工具",
    },
    {
        "task_type": "image_generation",
        "label": "图像生成",
        "chip": "Ascend910C",
        "framework": "MindSpore",
        "model": "SDXL-1.0",
        "image_name": "Ascend910C-MindSpore-SDXL-1.0",
        "toolset_name": "图像生成评测工具",
    },
    {
        "task_type": "video_understanding",
        "label": "视频理解",
        "chip": "Ascend910C",
        "framework": "PyTorch",
        "model": "VideoMAE",
        "image_name": "Ascend910C-PyTorch-VideoMAE",
        "toolset_name": "视频理解评测工具",
    },
    {
        "task_type": "ocr",
        "label": "文字识别 (OCR)",
        "chip": "P800",
        "framework": "PaddlePaddle",
        "model": "PaddleOCR",
        "image_name": "P800-PaddlePaddle-PaddleOCR",
        "toolset_name": "OCR 评测工具",
    },
    {
        "task_type": "recommendation",
        "label": "推荐系统",
        "chip": "Ascend910B",
        "framework": "MindSpore",
        "model": "DeepFM",
        "image_name": "Ascend910B-MindSpore-DeepFM",
        "toolset_name": "推荐系统评测工具",
    },
    {
        "task_type": "anomaly_detection",
        "label": "异常检测",
        "chip": "MLU590",
        "framework": "PyTorch",
        "model": "AutoEncoder",
        "image_name": "MLU590-PyTorch-AutoEncoder",
        "toolset_name": "异常检测评测工具",
    },
    {
        "task_type": "time_series",
        "label": "时序预测",
        "chip": "Ascend910B",
        "framework": "MindSpore",
        "model": "Informer",
        "image_name": "Ascend910B-MindSpore-Informer",
        "toolset_name": "时序预测评测工具",
    },
    {
        "task_type": "reinforcement_learning",
        "label": "强化学习",
        "chip": "Ascend910C",
        "framework": "PyTorch",
        "model": "PPO-Agent",
        "image_name": "Ascend910C-PyTorch-PPO-Agent",
        "toolset_name": "强化学习评测工具",
    },
    {
        "task_type": "graph_neural_network",
        "label": "图神经网络",
        "chip": "Ascend910B",
        "framework": "MindSpore",
        "model": "GAT",
        "image_name": "Ascend910B-MindSpore-GAT",
        "toolset_name": "图神经网络评测工具",
    },
    {
        "task_type": "medical_imaging",
        "label": "医学影像",
        "chip": "MLU590",
        "framework": "PyTorch",
        "model": "3D-UNet",
        "image_name": "MLU590-PyTorch-3D-UNet",
        "toolset_name": "医学影像评测工具",
    },
    {
        "task_type": "autonomous_driving",
        "label": "自动驾驶",
        "chip": "Ascend910C",
        "framework": "MindSpore",
        "model": "Apollo-Perception",
        "image_name": "Ascend910C-MindSpore-Apollo-Perception",
        "toolset_name": "自动驾驶评测工具",
    },
    {
        "task_type": "robot_control",
        "label": "机器人控制",
        "chip": "Ascend910B",
        "framework": "PyTorch",
        "model": "RL-Control",
        "image_name": "Ascend910B-PyTorch-RL-Control",
        "toolset_name": "机器人控制评测工具",
    },
    {
        "task_type": "code_generation",
        "label": "代码生成",
        "chip": "Ascend910C",
        "framework": "MindSpore",
        "model": "CodeQwen-7B",
        "image_name": "Ascend910C-MindSpore-CodeQwen-7B",
        "toolset_name": "代码生成评测工具",
    },
    {
        "task_type": "knowledge_graph",
        "label": "知识图谱",
        "chip": "P800",
        "framework": "PaddlePaddle",
        "model": "KG-BERT",
        "image_name": "P800-PaddlePaddle-KG-BERT",
        "toolset_name": "知识图谱评测工具",
    },
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


def create_image_asset(db: Session, scenario: dict, creator_id: int) -> DigitalAsset:
    """创建模型部署镜像资产"""
    # Check if already exists
    existing = db.query(DigitalAsset).filter(
        DigitalAsset.asset_type == AssetType.image,
        DigitalAsset.name == scenario["image_name"]
    ).first()
    
    if existing:
        print(f"  ⚠️  镜像已存在：{scenario['image_name']}")
        return existing
    
    # Create new image asset
    # Additional tags for better filtering
    chip_tags = [scenario["chip"]]
    framework_tags = [scenario["framework"]]
    
    image = DigitalAsset(
        name=scenario["image_name"],
        description=f"{scenario['label']}部署镜像 - {scenario['chip']} + {scenario['framework']} + {scenario['model']}",
        asset_type=AssetType.image,
        category=f"{scenario['label']}镜像",
        tags=[
            scenario["task_type"],  # 关键：task_type 标签用于前端过滤
            scenario["chip"],
            scenario["framework"],
            scenario["model"],
            scenario["label"],
        ],
        version="1.0.0",
        file_path=f"/images/{scenario['image_name'].lower()}.tar",
        file_size=15.5 * 1024 * 1024 * 1024,  # ~15.5GB
        status=AssetStatus.active,
        creator_id=creator_id,
        is_shared=True,
        share_scope=ShareScope.platform,
    )
    
    db.add(image)
    print(f"  ✅ 创建镜像：{scenario['image_name']}")
    return image


def create_toolset_asset(db: Session, scenario: dict, creator_id: int) -> DigitalAsset:
    """创建评测工具集资产"""
    # Check if already exists
    existing = db.query(DigitalAsset).filter(
        DigitalAsset.asset_type == AssetType.toolset,
        DigitalAsset.name == scenario["toolset_name"]
    ).first()
    
    if existing:
        print(f"  ⚠️  工具集已存在：{scenario['toolset_name']}")
        return existing
    
    # Create new toolset asset
    toolset = DigitalAsset(
        name=scenario["toolset_name"],
        description=f"{scenario['label']}专用评测工具集 - 支持吞吐量、延迟、准确率、能效比等指标测试",
        asset_type=AssetType.toolset,
        category=f"{scenario['label']}测试工具",
        tags=[
            scenario["task_type"],  # 关键：task_type 标签用于前端过滤
            "性能测试",
            "准确率测试",
            "吞吐量测试",
            "延迟测试",
        ],
        version="1.0.0",
        file_path=f"/toolsets/{scenario['toolset_name'].lower().replace(' ', '_')}.tar",
        file_size=256 * 1024 * 1024,  # ~256MB
        status=AssetStatus.active,
        creator_id=creator_id,
        is_shared=True,
        share_scope=ShareScope.platform,
    )
    
    db.add(toolset)
    print(f"  ✅ 创建工具集：{scenario['toolset_name']}")
    return toolset


def main():
    """主函数"""
    print("=" * 60)
    print("开始为 25 个模型部署子场景创建镜像和工具集数据")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Get or create admin user
        admin_user = get_or_create_admin_user(db)
        print(f"\n使用管理员用户：{admin_user.username} (ID: {admin_user.id})\n")
        
        created_images = 0
        created_toolsets = 0
        skipped_images = 0
        skipped_toolsets = 0
        
        for i, scenario in enumerate(SCENARIOS, 1):
            print(f"[{i:2d}/25] {scenario['label']} ({scenario['task_type']})")
            
            # Create image
            image = create_image_asset(db, scenario, admin_user.id)
            if image.id:
                created_images += 1
            else:
                skipped_images += 1
            
            # Create toolset
            toolset = create_toolset_asset(db, scenario, admin_user.id)
            if toolset.id:
                created_toolsets += 1
            else:
                skipped_toolsets += 1
        
        # Commit all changes
        db.commit()
        
        print("\n" + "=" * 60)
        print("数据创建完成！")
        print("=" * 60)
        print(f"✅ 新增镜像：{created_images} 个")
        print(f"✅ 新增工具集：{created_toolsets} 个")
        print(f"⚠️  跳过镜像：{skipped_images} 个（已存在）")
        print(f"⚠️  跳过工具集：{skipped_toolsets} 个（已存在）")
        print("\n所有资产的 tags 都已包含对应的 task_type，前端过滤逻辑可正常工作。")
        
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
