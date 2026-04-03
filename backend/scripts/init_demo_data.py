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
    ("华为昇腾910C", DeviceType.huawei_910c, "华为", 24),
    ("华为昇腾910B", DeviceType.huawei_910b, "华为", 24),
    ("寒武纪MLU590", DeviceType.cambrian_590, "寒武纪", 24),
    ("昆仑芯P800", DeviceType.kunlun_p800, "昆仑芯", 12),
    ("海光DCU BW1000", DeviceType.hygon_bw1000, "海光", 8),
    ("本机 CPU 测试节点", DeviceType.cpu_test, "本机容器节点", 1),
]


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
            if device.device_type != device_type:
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
    if created:
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


def print_summary(db):
    user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    task_count = db.execute(text("SELECT COUNT(*) FROM evaluation_tasks")).scalar()
    tenant_count = db.execute(text("SELECT COUNT(*) FROM tenants")).scalar()
    device_count = db.execute(text("SELECT COUNT(*) FROM compute_devices")).scalar()
    print(f"users={user_count}, tenants={tenant_count}, devices={device_count}, evaluation_tasks={task_count}")
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
        role_assigned = assign_roles(db, users)

        print("[init_demo_data] done")
        print(f"  roles_created={role_created}")
        print(f"  users_created={user_created}, users_updated={user_updated}")
        print(f"  tenant1_created={tenant_created}, tenant1_id={tenant.id}")
        print(f"  devices_created={device_created}")
        print(f"  roles_assigned={role_assigned}")
        print_summary(db)
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
