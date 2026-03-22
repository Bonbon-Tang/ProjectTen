#!/usr/bin/env python3
"""
批量更新模型镜像的 tags 字段
格式：[芯片型号，框架名称，子场景 1, 子场景 2, ...]
"""

import sys
sys.path.insert(0, '/root/.openclaw/workspace/ProjectTen/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.models.asset import DigitalAsset

# 芯片映射（描述中的中文 -> 简写）
CHIP_MAP = {
    '华为昇腾 910C': '910C',
    '华为昇腾 910B': '910B',
    '寒武纪 MLU590': 'MLU590',
    '昆仑芯 P800': 'P800',
    '海光 DCU BW1000': 'BW1000',
}

# 框架映射
FRAMEWORK_MAP = {
    'MindSpore': 'MindSpore',
    'PyTorch': 'PyTorch',
    'PaddlePaddle': 'PaddlePaddle',
    'ROCm': 'ROCm',
}

# 子场景映射（中文 -> 英文）
SCENARIO_MAP = {
    '大语言模型': 'llm',
    '多模态': 'multimodal',
    '语音识别': 'speech_recognition',
    '图像分类': 'image_classification',
    '目标检测': 'object_detection',
    '语义分割': 'semantic_segmentation',
    '文本生成': 'text_generation',
    '机器翻译': 'machine_translation',
    '情感分析': 'sentiment_analysis',
    '问答系统': 'question_answering',
    '文本摘要': 'text_summarization',
    '语音合成': 'speech_synthesis',
    '图像生成': 'image_generation',
    '视频理解': 'video_understanding',
    '文字识别 (OCR)': 'ocr',
    '推荐系统': 'recommendation',
    '异常检测': 'anomaly_detection',
    '时序预测': 'time_series',
    '强化学习': 'reinforcement_learning',
    '图神经网络': 'graph_neural_network',
    '医学影像': 'medical_imaging',
    '自动驾驶': 'autonomous_driving',
    '机器人控制': 'robot_control',
    '代码生成': 'code_generation',
    '知识图谱': 'knowledge_graph',
}

def parse_description(desc: str):
    """从描述中解析芯片、框架、模型信息"""
    if not desc:
        return None, None, None
    
    # 处理两种格式：
    # 1. "Chip + Framework + Model"
    # 2. "Prefix - Chip + Framework + Model"
    parts = desc.split(" + ")
    if len(parts) < 2:
        return None, None, None
    
    # 提取芯片名（处理前缀）
    raw_chip = parts[0].strip()
    if " - " in raw_chip:
        chip_name = raw_chip.split(" - ")[-1].strip()
    else:
        chip_name = raw_chip
    
    framework = parts[1].strip() if len(parts) > 1 else None
    model = parts[2].strip() if len(parts) > 2 else None
    
    return chip_name, framework, model

def extract_scenarios(tags: list, desc: str) -> list:
    """从现有 tags 和描述中提取子场景"""
    scenarios = []
    
    # 从 tags 中提取英文场景
    for tag in tags:
        if tag in SCENARIO_MAP.values():
            scenarios.append(tag)
    
    # 从描述中提取中文场景并转换
    for cn, en in SCENARIO_MAP.items():
        if cn in desc and en not in scenarios:
            scenarios.append(en)
    
    return scenarios

def update_image_tags():
    """批量更新所有镜像的 tags"""
    engine = create_engine('sqlite:///data/app.db')
    
    with Session(engine) as session:
        images = session.query(DigitalAsset).filter(
            DigitalAsset.asset_type == 'image',
            DigitalAsset.status == 'active',
        ).all()
        
        print(f"找到 {len(images)} 个镜像\n")
        
        updated_count = 0
        for img in images:
            old_tags = img.tags or []
            desc = img.description or ""
            
            # 解析描述
            chip_name, framework, model = parse_description(desc)
            
            # 转换芯片名为简写
            chip_short = None
            if chip_name:
                chip_short = CHIP_MAP.get(chip_name)
                # 如果映射表中没有，尝试直接提取型号
                if not chip_short:
                    for cn, short in CHIP_MAP.items():
                        if cn in chip_name or short in chip_name:
                            chip_short = short
                            break
            
            # 提取子场景
            scenarios = extract_scenarios(old_tags, desc)
            
            # 构建新 tags
            new_tags = []
            if chip_short:
                new_tags.append(chip_short)
            if framework:
                new_tags.append(framework)
            new_tags.extend(scenarios)
            
            # 去重
            new_tags = list(dict.fromkeys(new_tags))
            
            # 更新
            if new_tags != old_tags:
                img.tags = new_tags
                updated_count += 1
                print(f"✅ {img.name}")
                print(f"   旧 tags: {old_tags}")
                print(f"   新 tags: {new_tags}")
                print()
        
        session.commit()
        print(f"\n完成！更新了 {updated_count}/{len(images)} 个镜像")

if __name__ == '__main__':
    update_image_tags()
