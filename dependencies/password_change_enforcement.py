from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from jose import JWTError
from sqlalchemy.orm import Session

from database.database import SessionLocal
from models.user import User
from utils.security import decode_access_token

_PASSWORD_CHANGE_ALLOWED_PATHS = frozenset(
    {
        "/auth/change-password",
        "/auth/refresh",
        "/users/me",
    }
)

_PUBLIC_PREFIXES = (
    "/auth/login",
    "/auth/register-investigator",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
)


def _is_public_path(path: str) -> bool:
    if path == "/":
        return True
    return any(path.startswith(prefix) for prefix in _PUBLIC_PREFIXES)


def _load_user_from_bearer(db: Session, authorization: str | None) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    return db.query(User).filter(User.id == int(user_id)).first()


def register_password_change_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def enforce_password_change(request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS" or _is_public_path(path):
            return await call_next(request)

        db = SessionLocal()
        try:
            user = _load_user_from_bearer(db, request.headers.get("Authorization"))
            if (
                user is not None
                and user.must_change_password
                and path not in _PASSWORD_CHANGE_ALLOWED_PATHS
            ):
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "You must change your password before continuing.",
                    },
                )
        finally:
            db.close()

        return await call_next(request)
