from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.user import User, UserStatus
from app.utils.pagination import PaginationParams


class UserService:

    @staticmethod
    def list_users(
        db: Session,
        pagination: PaginationParams,
        *,
        status: Optional[str] = None,
        user_type: Optional[str] = None,
        keyword: Optional[str] = None,
    ) -> Tuple[List[User], int]:
        q = db.query(User)
        if status:
            q = q.filter(User.status == status)
        if user_type:
            q = q.filter(User.user_type == user_type)
        if keyword:
            q = q.filter(or_(User.username.contains(keyword), User.email.contains(keyword)))
        total = q.count()
        users = q.offset(pagination.offset).limit(pagination.limit).all()
        return users, total

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def update_user(db: Session, user: User, **kwargs) -> User:
        for k, v in kwargs.items():
            if v is not None and hasattr(user, k):
                setattr(user, k, v)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_status(db: Session, user: User, status: str) -> User:
        user.status = UserStatus(status)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user: User) -> None:
        db.delete(user)
        db.commit()
