#!/usr/bin/env python3
from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from app.database import Base, SessionLocal, engine
from app.models.asset import AssetStatus, AssetType, DigitalAsset, ShareScope
from app.models.evaluation import CreateMode, EvaluationTask, Priority, TaskCategory, TaskStatus, TaskType, build_primary_tag
from app.models.resource import ComputeDevice, DeviceStatus, DeviceType
from app.models.role import Role
from app.models.tenant import Tenant, TenantStatus
from app.models.user import User, UserStatus, UserType
from app.utils.security import hash_password

DEMO_USERS = [
    {
        "username": "admin",
        "email": "admin@test.com",
        "phone": "13800138000",
        "password": "admin123",
        "user_type": UserType.admin,
        "status": UserStatus.active,
        "tenant_id": None,
    },
    {
        "username": "usr1",
        "email": "usr1@example.com",
        "phone": "13800138001",
        "password": "123",
        "user_type": UserType.personal,
        "status": UserStatus.active,
        "tenant_id": None,
    },
    {
        "username": "tenant1",
        "email": "tenant1@example.com",
        "phone": "13800138002",
        "password": "123",
        "user_type": UserType.enterprise,
        "status": UserStatus.active,
        "tenant_id": "tenant1",
    },
]

ROLE_NAMES = ["admin", "user", "tenant"]

GLOBAL_DEVICES = [
    ("英伟达 H200", DeviceType.nvidia_h200.value, "NVIDIA", 16),
    ("华为昇腾910C", DeviceType.huawei_910c, "华为", 24),
    ("华为昇腾910B", DeviceType.huawei_910b, "华为", 24),
    ("寒武纪MLU590", DeviceType.cambrian_590, "寒武纪", 24),
    ("昆仑芯P800", DeviceType.kunlun_p800, "昆仑芯", 12),
    ("海光DCU BW1000", DeviceType.hygon_bw1000, "海光", 8),
    ("本机 CPU 测试节点", DeviceType.cpu_test, "本机容器节点", 1),
]

CHIP_MATRIX = [
    {"label": "英伟达 H200", "tag": "nvidia_h200", "device_type": DeviceType.nvidia_h200.value, "manufacturer": "NVIDIA"},
    {"label": "华为昇腾 910C", "tag": DeviceType.huawei_910c.value, "device_type": DeviceType.huawei_910c.value, "manufacturer": "华为"},
    {"label": "华为昇腾 910B", "tag": DeviceType.huawei_910b.value, "device_type": DeviceType.huawei_910b.value, "manufacturer": "华为"},
    {"label": "寒武纪 MLU590", "tag": DeviceType.cambrian_590.value, "device_type": DeviceType.cambrian_590.value, "manufacturer": "寒武纪"},
    {"label": "昆仑芯 P800", "tag": DeviceType.kunlun_p800.value, "device_type": DeviceType.kunlun_p800.value, "manufacturer": "昆仑芯"},
    {"label": "海光 DCU BW1000", "tag": DeviceType.hygon_bw1000.value, "device_type": DeviceType.hygon_bw1000.value, "manufacturer": "海光"},
]

MIDDLEWARE_BY_SCENARIO = {
    "llm": "vllm",
    "multimodal": "sglang",
    "speech_recognition": "onnxruntime",
    "image_classification": "triton",
    "object_detection": "triton",
    "semantic_segmentation": "triton",
    "text_generation": "vllm",
    "machine_translation": "vllm",
    "sentiment_analysis": "onnxruntime",
    "question_answering": "vllm",
    "text_summarization": "vllm",
    "speech_synthesis": "tensorrt-llm",
    "image_generation": "comfyui",
    "video_understanding": "sglang",
    "ocr": "onnxruntime",
    "recommendation": "deepspeed",
    "anomaly_detection": "triton",
    "time_series": "onnxruntime",
    "reinforcement_learning": "ray",
    "graph_neural_network": "dgl",
    "medical_imaging": "monai",
    "autonomous_driving": "triton",
    "robot_control": "ros2",
    "code_generation": "vllm",
    "knowledge_graph": "deepspeed",
}

SCENARIO_LABELS = {
    "llm": "大语言模型",
    "multimodal": "多模态",
    "speech_recognition": "语音识别",
    "image_classification": "图像分类",
    "object_detection": "目标检测",
    "semantic_segmentation": "语义分割",
    "text_generation": "文本生成",
    "machine_translation": "机器翻译",
    "sentiment_analysis": "情感分析",
    "question_answering": "问答系统",
    "text_summarization": "文本摘要",
    "speech_synthesis": "语音合成",
    "image_generation": "图像生成",
    "video_understanding": "视频理解",
    "ocr": "OCR",
    "recommendation": "推荐系统",
    "anomaly_detection": "异常检测",
    "time_series": "时序预测",
    "reinforcement_learning": "强化学习",
    "graph_neural_network": "图神经网络",
    "medical_imaging": "医学影像",
    "autonomous_driving": "自动驾驶",
    "robot_control": "机器人控制",
    "code_generation": "代码生成",
    "knowledge_graph": "知识图谱",
}

DEMO_SCENARIOS = list(SCENARIO_LABELS.keys())


def ensure_roles(db):
    created = 0
    for name in ROLE_NAMES:
        role = db.query(Role).filter(Role.name == name).first()
        if not role:
            db.add(Role(name=name, description=f"system role: {name}", is_system=True, permissions=[]))
            created += 1
    if created:
        db.commit()
    return created


def ensure_users(db):
    created = 0
    updated = 0
    users = {}
    for spec in DEMO_USERS:
        user = db.query(User).filter(User.username == spec["username"]).first()
        if not user:
            user = User(
                username=spec["username"],
                email=spec["email"],
                phone=spec["phone"],
                password_hash=hash_password(spec["password"]),
                user_type=spec["user_type"],
                status=spec["status"],
                is_verified=False,
                is_2fa_enabled=False,
            )
            db.add(user)
            created += 1
            db.flush()
        else:
            changed = False
            if user.email != spec["email"]:
                user.email = spec["email"]
                changed = True
            if user.phone != spec["phone"]:
                user.phone = spec["phone"]
                changed = True
            if user.user_type != spec["user_type"]:
                user.user_type = spec["user_type"]
                changed = True
            if user.status != spec["status"]:
                user.status = spec["status"]
                changed = True
            desired_hash = hash_password(spec["password"])
            if user.password_hash != desired_hash:
                user.password_hash = desired_hash
                changed = True
            if changed:
                updated += 1
        users[spec["username"]] = user
    db.commit()
    return created, updated, users


def ensure_tenant1(db, users):
    tenant_user = users["tenant1"]
    tenant = db.query(Tenant).filter(Tenant.name == "tenant1").first()
    if not tenant:
        tenant = Tenant(
            name="tenant1",
            type="enterprise",
            description="Demo tenant for local development",
            owner_id=tenant_user.id,
            status=TenantStatus.active,
            compute_quota=1000.0,
            storage_quota=100.0,
            max_concurrent_tasks=2,
            device_allocation={"huawei_910c": 1},
            device_allocation_expires_at=datetime.utcnow() + timedelta(days=30),
            expires_at=datetime.utcnow() + timedelta(days=30),
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        created = True
    else:
        created = False

    changed = False
    if tenant.owner_id != tenant_user.id:
        tenant.owner_id = tenant_user.id
        changed = True
    alloc = tenant.device_allocation or {}
    if alloc.get("huawei_910c") != 1:
        tenant.device_allocation = {**alloc, "huawei_910c": 1}
        changed = True
    if tenant.status != TenantStatus.active:
        tenant.status = TenantStatus.active
        changed = True
    if changed:
        db.commit()

    if tenant_user.tenant_id != tenant.id:
        tenant_user.tenant_id = tenant.id
        db.commit()

    return created, tenant


def ensure_global_devices(db):
    created = 0
    for name, device_type, manufacturer, total in GLOBAL_DEVICES:
        device = db.query(ComputeDevice).filter(
            ComputeDevice.name == name,
            ComputeDevice.tenant_id.is_(None),
        ).first()
        if not device:
            device = ComputeDevice(
                name=name,
                device_type=device_type,
                manufacturer=manufacturer,
                total_count=total,
                available_count=total,
                specs={},
                status=DeviceStatus.online,
                tenant_id=None,
            )
            db.add(device)
            created += 1
        else:
            changed = False
            if str(device.device_type) != str(device_type):
                device.device_type = device_type
                changed = True
            if device.manufacturer != manufacturer:
                device.manufacturer = manufacturer
                changed = True
            if device.total_count < total:
                delta = total - device.total_count
                device.total_count = total
                device.available_count = max(device.available_count + delta, 0)
                changed = True
            if device.status != DeviceStatus.online:
                device.status = DeviceStatus.online
                changed = True
            if changed:
                db.add(device)
    db.commit()
    return created


def assign_roles(db, users):
    roles = {r.name: r for r in db.query(Role).all()}
    mapping = {
        "admin": "admin",
        "usr1": "user",
        "tenant1": "tenant",
    }
    changes = 0
    for username, role_name in mapping.items():
        user = users[username]
        role = roles.get(role_name)
        if role and role not in user.roles:
            user.roles.append(role)
            changes += 1
    if changes:
        db.commit()
    return changes


def scenario_slug(scenario: str) -> str:
    return scenario


def model_slug(scenario: str) -> str:
    return f"{scenario}_base"


def ensure_image_assets(db, users):
    created = 0
    updated = 0
    creator = users["admin"]
    next_suffix = 1
    existing_codes = {
        str(a.asset_code) for a in db.query(DigitalAsset).filter(DigitalAsset.asset_code.isnot(None)).all()
    }

    def allocate_code(prefix: str) -> str:
        nonlocal next_suffix
        while True:
            code = f"{prefix}{next_suffix:04d}"
            next_suffix += 1
            if code not in existing_codes:
                existing_codes.add(code)
                return code

    for chip in CHIP_MATRIX:
        for scenario in DEMO_SCENARIOS:
            middleware = MIDDLEWARE_BY_SCENARIO[scenario]
            scenario_label = SCENARIO_LABELS[scenario]
            name = f"{chip['tag']}_{middleware}_{model_slug(scenario)}"
            asset = db.query(DigitalAsset).filter(DigitalAsset.name == name, DigitalAsset.asset_type == AssetType.image).first()
            tags = [chip['tag'], middleware, scenario, model_slug(scenario)]
            description = f"Baseline deployment image for {scenario_label} on {chip['tag']} with fixed tags: chip / middleware / subtask / model."
            file_path = f"registry.example.com/projectten/{chip['device_type']}/{middleware}:{model_slug(scenario)}"
            category = "model_deployment"
            if not asset:
                prefix = {
                    'llm': '02', 'multimodal': '04', 'speech_recognition': '03', 'image_classification': '05',
                    'object_detection': '06', 'semantic_segmentation': '07', 'text_generation': '08',
                    'machine_translation': '09', 'sentiment_analysis': '10', 'question_answering': '11',
                    'text_summarization': '12', 'speech_synthesis': '13', 'image_generation': '14',
                    'video_understanding': '15', 'ocr': '16', 'recommendation': '17', 'anomaly_detection': '18',
                    'time_series': '19', 'reinforcement_learning': '20', 'graph_neural_network': '21',
                    'medical_imaging': '22', 'autonomous_driving': '23', 'robot_control': '24',
                    'code_generation': '25', 'knowledge_graph': '26',
                }[scenario]
                asset = DigitalAsset(
                    name=name,
                    description=description,
                    asset_type=AssetType.image,
                    category=category,
                    tags=tags,
                    asset_code=allocate_code(prefix),
                    version="1.0.0",
                    file_path=file_path,
                    file_size=0.0,
                    status=AssetStatus.active,
                    creator_id=creator.id,
                    tenant_id=None,
                    is_shared=True,
                    share_scope=ShareScope.platform,
                    download_count=0,
                    reuse_count=0,
                )
                db.add(asset)
                created += 1
            else:
                changed = False
                if asset.description != description:
                    asset.description = description
                    changed = True
                if asset.category != category:
                    asset.category = category
                    changed = True
                if asset.tags != tags:
                    asset.tags = tags
                    changed = True
                if asset.file_path != file_path:
                    asset.file_path = file_path
                    changed = True
                if not asset.asset_code:
                    prefix = {
                        'llm': '02', 'multimodal': '04', 'speech_recognition': '03', 'image_classification': '05',
                        'object_detection': '06', 'semantic_segmentation': '07', 'text_generation': '08',
                        'machine_translation': '09', 'sentiment_analysis': '10', 'question_answering': '11',
                        'text_summarization': '12', 'speech_synthesis': '13', 'image_generation': '14',
                        'video_understanding': '15', 'ocr': '16', 'recommendation': '17', 'anomaly_detection': '18',
                        'time_series': '19', 'reinforcement_learning': '20', 'graph_neural_network': '21',
                        'medical_imaging': '22', 'autonomous_driving': '23', 'robot_control': '24',
                        'code_generation': '25', 'knowledge_graph': '26',
                    }[scenario]
                    asset.asset_code = allocate_code(prefix)
                    changed = True
                if asset.share_scope != ShareScope.platform:
                    asset.share_scope = ShareScope.platform
                    changed = True
                if not asset.is_shared:
                    asset.is_shared = True
                    changed = True
                if changed:
                    updated += 1
    db.commit()
    return created, updated


def ensure_demo_tasks(db, users):
    created = 0
    updated = 0
    admin = users["admin"]
    image_assets = db.query(DigitalAsset).filter(DigitalAsset.asset_type == AssetType.image, DigitalAsset.status == AssetStatus.active).all()
    images_by_key = {}
    for asset in image_assets:
        tags = asset.tags or []
        if len(tags) >= 3:
            images_by_key[(tags[0], tags[2])] = asset

    desired_specs = [
        ("nvidia_h200", "llm", TaskStatus.completed, 100),
        ("nvidia_h200", "multimodal", TaskStatus.running, 65),
        ("nvidia_h200", "image_generation", TaskStatus.queued, 0),
        ("nvidia_h200", "code_generation", TaskStatus.pending, 0),
        ("910C", "llm", TaskStatus.completed, 100),
        ("910C", "speech_recognition", TaskStatus.completed, 100),
        ("910B", "ocr", TaskStatus.failed, 100),
        ("MLU590", "object_detection", TaskStatus.completed, 100),
        ("MLU590", "semantic_segmentation", TaskStatus.running, 45),
        ("P800", "time_series", TaskStatus.completed, 100),
        ("BW1000", "recommendation", TaskStatus.completed, 100),
        ("nvidia_h200", "question_answering", TaskStatus.completed, 100),
    ]

    for idx, (chip_tag, scenario, status, progress) in enumerate(desired_specs, start=1):
        name = f"Demo-{chip_tag}-{scenario}-{idx:02d}"
        task = db.query(EvaluationTask).filter(EvaluationTask.name == name).first()
        image = images_by_key.get((chip_tag, scenario))
        payload = {
            'name': name,
            'description': f"用于前端演示的 {scenario} 评测任务（{chip_tag}）",
            'task_category': TaskCategory.model_deployment_test,
            'task_type': getattr(TaskType, scenario),
            'create_mode': CreateMode.template,
            'status': status,
            'priority': Priority.medium,
            'progress': progress,
            'device_type': next((c['device_type'] for c in CHIP_MATRIX if c['tag'] == chip_tag), chip_tag),
            'device_count': 1,
            'visibility': 'platform',
            'image_id': image.id if image else None,
            'image_code': image.asset_code if image else None,
            'toolset_id': None,
            'toolset_code': None,
            'config': {'demo': True, 'scenario': scenario, 'chip_tag': chip_tag},
            'result': {'summary': 'demo seeded task'},
            'metrics': {'latency_ms': 20 + idx, 'score': max(60, 98 - idx)},
            'creator_id': admin.id,
            'tenant_id': None,
            'tags': [build_primary_tag(TaskCategory.model_deployment_test.value, scenario), chip_tag, scenario],
            'primary_tag': build_primary_tag(TaskCategory.model_deployment_test.value, scenario),
        }
        if not task:
            task = EvaluationTask(**payload)
            db.add(task)
            created += 1
        else:
            changed = False
            for key, value in payload.items():
                if getattr(task, key) != value:
                    setattr(task, key, value)
                    changed = True
            if changed:
                updated += 1
    db.commit()
    return created, updated


def print_summary(db):
    user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    task_count = db.execute(text("SELECT COUNT(*) FROM evaluation_tasks")).scalar()
    tenant_count = db.execute(text("SELECT COUNT(*) FROM tenants")).scalar()
    device_count = db.execute(text("SELECT COUNT(*) FROM compute_devices")).scalar()
    asset_count = db.execute(text("SELECT COUNT(*) FROM digital_assets")).scalar()
    print(f"users={user_count}, tenants={tenant_count}, devices={device_count}, assets={asset_count}, evaluation_tasks={task_count}")
    print("demo accounts:")
    print("  admin / admin123")
    print("  usr1 / 123")
    print("  tenant1 / 123")


def main() -> int:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        role_created = ensure_roles(db)
        user_created, user_updated, users = ensure_users(db)
        tenant_created, tenant = ensure_tenant1(db, users)
        device_created = ensure_global_devices(db)
        asset_created, asset_updated = ensure_image_assets(db, users)
        task_created, task_updated = ensure_demo_tasks(db, users)
        role_assigned = assign_roles(db, users)

        print("[init_demo_data] done")
        print(f"  roles_created={role_created}")
        print(f"  users_created={user_created}, users_updated={user_updated}")
        print(f"  tenant1_created={tenant_created}, tenant1_id={tenant.id}")
        print(f"  devices_created={device_created}")
        print(f"  assets_created={asset_created}, assets_updated={asset_updated}")
        print(f"  tasks_created={task_created}, tasks_updated={task_updated}")
        print(f"  roles_assigned={role_assigned}")
        print_summary(db)
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
