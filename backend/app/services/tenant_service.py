from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.tenant import Tenant, TenantStatus
from app.models.user import User
from app.utils.pagination import PaginationParams


class TenantService:

    @staticmethod
    def create(db: Session, *, name: str, owner_id: int, type: Optional[str] = None,
               description: Optional[str] = None) -> Tenant:
        if db.query(Tenant).filter(Tenant.name == name).first():
            raise ValueError("Tenant name already exists")
        tenant = Tenant(name=name, owner_id=owner_id, type=type, description=description)
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        # Also set the owner's tenant_id
        owner = db.query(User).filter(User.id == owner_id).first()
        if owner and owner.tenant_id is None:
            owner.tenant_id = tenant.id
            db.commit()
        return tenant

    @staticmethod
    def list_tenants(db: Session, pagination: PaginationParams) -> Tuple[List[Tenant], int]:
        q = db.query(Tenant)
        total = q.count()
        tenants = q.offset(pagination.offset).limit(pagination.limit).all()
        return tenants, total

    @staticmethod
    def get_by_id(db: Session, tenant_id: int) -> Optional[Tenant]:
        return db.query(Tenant).filter(Tenant.id == tenant_id).first()

    @staticmethod
    def update(db: Session, tenant: Tenant, **kwargs) -> Tenant:
        for k, v in kwargs.items():
            if v is not None and hasattr(tenant, k):
                if k == "status":
                    v = TenantStatus(v)
                setattr(tenant, k, v)
        db.commit()
        db.refresh(tenant)
        return tenant

    @staticmethod
    def add_member(db: Session, tenant: Tenant, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        user.tenant_id = tenant.id
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def remove_member(db: Session, tenant: Tenant, user_id: int) -> None:
        user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant.id).first()
        if not user:
            raise ValueError("User not found in this tenant")
        user.tenant_id = None
        db.commit()

    @staticmethod
    def update_quota(db: Session, tenant: Tenant, *, compute_quota: Optional[float] = None,
                     storage_quota: Optional[float] = None,
                     max_concurrent_tasks: Optional[int] = None) -> Tenant:
        if compute_quota is not None:
            tenant.compute_quota = compute_quota
        if storage_quota is not None:
            tenant.storage_quota = storage_quota
        if max_concurrent_tasks is not None:
            tenant.max_concurrent_tasks = max_concurrent_tasks
        db.commit()
        db.refresh(tenant)
        return tenant
