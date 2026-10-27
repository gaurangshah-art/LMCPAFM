from __future__ import annotations

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from models.password_reset_token import PasswordResetToken
from models.user import User
from utils.app_email import send_plain_email
from utils.institutional_email import normalize_email

logger = logging.getLogger(__name__)

RESET_TOKEN_TTL_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_MINUTES", "60"))


def _hash_token(plain_token: str) -> str:
    return hashlib.sha256(plain_token.encode("utf-8")).hexdigest()


def _frontend_public_url() -> str:
    configured = os.getenv("FRONTEND_PUBLIC_URL", "").strip()
    if configured:
        return configured.rstrip("/")

    cors = os.getenv("CORS_ALLOW_ORIGINS", "")
    for origin in cors.split(","):
        origin = origin.strip()
        if origin:
            return origin.rstrip("/")

    return "http://localhost:5173"


def _invalidate_existing_tokens(db: Session, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used_at.is_(None),
        )
        .update({PasswordResetToken.used_at: now}, synchronize_session=False)
    )


def request_password_reset(db: Session, email: str) -> bool:
    """Create a reset token and email the user. Returns True if a user was found."""
    normalized = normalize_email(email)
    user = db.query(User).filter(User.email == normalized).first()
    if user is None or not user.status:
        return False

    plain_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)

    _invalidate_existing_tokens(db, user.id)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(plain_token),
            expires_at=expires_at,
        )
    )
    db.flush()

    reset_url = f"{_frontend_public_url()}/reset-password?token={plain_token}"
    subject = "LMCPAFM password reset"
    body = "\n".join(
        [
            f"Hello {user.name},",
            "",
            "We received a request to reset your LMCPAFM password.",
            "Open the link below to choose a new password:",
            "",
            reset_url,
            "",
            f"This link expires in {RESET_TOKEN_TTL_MINUTES} minutes.",
            "If you did not request this, you can ignore this email.",
            "",
            "Regards,",
            "LMCPAFM",
        ]
    )

    try:
        send_plain_email(to_email=user.email, subject=subject, body=body)
    except CRUDValidationError:
        logger.warning(
            "Password reset email is not configured. Reset link for %s: %s",
            user.email,
            reset_url,
        )
    except Exception:
        logger.exception("Failed to send password reset email to %s", user.email)
        raise

    return True


def reset_password_with_token(db: Session, *, plain_token: str, new_password: str) -> User:
    if not plain_token.strip():
        raise CRUDValidationError("Reset token is required.")
    if len(new_password) < 8:
        raise CRUDValidationError("Password must be at least 8 characters.")

    token_hash = _hash_token(plain_token.strip())
    now = datetime.now(timezone.utc)

    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )
    if record is None:
        raise CRUDValidationError("This reset link is invalid or has expired.")

    user = db.query(User).filter(User.id == record.user_id).first()
    if user is None or not user.status:
        raise CRUDValidationError("This reset link is invalid or has expired.")

    from utils.security import hash_password, verify_password

    if verify_password(new_password, user.password_hash):
        raise CRUDValidationError("New password must differ from your current password.")

    user.password_hash = hash_password(new_password)
    record.used_at = now
    db.add(user)
    db.add(record)
    db.flush()
    return user
