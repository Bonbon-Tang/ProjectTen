from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User, UserType, UserStatus
from app.schemas.auth import LoginRequest
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:

    @staticmethod
    def register(db: Session, *, username: str, email: str, password: str,
                 phone: Optional[str] = None, user_type: str = "personal") -> User:
        # Check uniqueness
        if db.query(User).filter(User.username == username).first():
            raise ValueError("Username already exists")
        if db.query(User).filter(User.email == email).first():
            raise ValueError("Email already registered")
        if phone and db.query(User).filter(User.phone == phone).first():
            raise ValueError("Phone number already registered")

        user = User(
            username=username,
            email=email,
            phone=phone,
            password_hash=hash_password(password),
            user_type=UserType(user_type),
            status=UserStatus.active,
            is_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def authenticate(db: Session, *, username: str, password: str) -> User:
        user = db.query(User).filter(User.username == username).first()
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")
        if user.status != UserStatus.active:
            raise ValueError("Account is not active")
        return user

    @staticmethod
    def create_tokens(user: User) -> dict:
        data = {"sub": str(user.id)}
        return {
            "access_token": create_access_token(data),
            "refresh_token": create_refresh_token(data),
            "token_type": "bearer",
        }

    @staticmethod
    def refresh_access_token(refresh_token: str) -> dict:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        user_id = payload.get("sub")
        data = {"sub": str(user_id)}
        return {
            "access_token": create_access_token(data),
            "refresh_token": create_refresh_token(data),
            "token_type": "bearer",
        }

    @staticmethod
    def reset_password(db: Session, *, email: str, new_password: str) -> bool:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError("User not found")
        user.password_hash = hash_password(new_password)
        db.commit()
        return True
