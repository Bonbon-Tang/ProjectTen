from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, write_audit_log
from app.models.user import User
from app.schemas.auth import LoginRequest, PasswordResetRequest, Token, TokenRefresh
from app.schemas.user import UserCreate, UserOut
from app.services.auth_service import AuthService

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.post("/register")
def register(body: UserCreate, request: Request, db: Session = Depends(get_db)):
    try:
        user = AuthService.register(
            db, username=body.username, email=body.email,
            password=body.password, phone=body.phone, user_type=body.user_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=user.id, action="register", resource_type="user",
                    resource_id=user.id, ip_address=request.client.host if request.client else None)

    tokens = AuthService.create_tokens(user)
    return _ok({"user": UserOut.model_validate(user).model_dump(), **tokens})


@router.post("/login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    try:
        user = AuthService.authenticate(db, username=body.username, password=body.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    write_audit_log(db, user_id=user.id, action="login", resource_type="user",
                    resource_id=user.id, ip_address=request.client.host if request.client else None)

    tokens = AuthService.create_tokens(user)
    return _ok(tokens)


@router.post("/refresh")
def refresh(body: TokenRefresh):
    try:
        tokens = AuthService.refresh_access_token(body.refresh_token)
    except (ValueError, JWTError) as e:
        raise HTTPException(status_code=401, detail=str(e))
    return _ok(tokens)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # JWT is stateless; client should discard token.
    write_audit_log(db, user_id=current_user.id, action="logout", resource_type="user",
                    resource_id=current_user.id)
    return _ok(message="Logged out successfully")


@router.post("/password/reset")
def password_reset(body: PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    try:
        AuthService.reset_password(db, email=body.email, new_password=body.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(db, user_id=None, action="password_reset", resource_type="user",
                    ip_address=request.client.host if request.client else None)
    return _ok(message="Password reset successfully")
