#!/usr/bin/env python3
"""
修复 Speech-Deploy-Bench 工具集缺少 speech_recognition tag 的问题。
用于确保前端 /evaluations/create 选择"语音识别"场景时能正确显示该工具集。

用法：
    cd backend
    source venv/bin/activate
    python scripts/fix_speech_recognition_toolset_tags.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.asset import DigitalAsset


def main():
    db = SessionLocal()
    try:
        ts = db.query(DigitalAsset).filter(DigitalAsset.id == 155).first()
        if not ts:
            print("未找到 ID=155 的工具集，尝试按名称查找...")
            ts = db.query(DigitalAsset).filter(
                DigitalAsset.asset_type == 'toolset',
                DigitalAsset.name == 'Speech-Deploy-Bench'
            ).first()

        if not ts:
            print("ERROR: 未找到 Speech-Deploy-Bench 工具集")
            sys.exit(1)

        tags = set(ts.tags or [])
        needed = {'speech_recognition', 'asr', '语音识别', '语音合成'}
        added = []
        for tag in needed:
            if tag not in tags:
                tags.add(tag)
                added.append(tag)

        if added:
            ts.tags = list(tags)
            db.commit()
            print(f"已添加 tags: {added}")
            print(f"当前 tags: {ts.tags}")
        else:
            print("tags 已完整，无需修改，当前 tags:", ts.tags)

    finally:
        db.close()


if __name__ == '__main__':
    main()
