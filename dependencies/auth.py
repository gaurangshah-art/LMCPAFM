from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from database.database import get_db
from models.user import User
from utils.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def user_role_names(user: User) -> list[str]:
    """Return system role names from the user_roles association."""
    return [
        str(role.name)
        for role in (getattr(user, "roles", []) or [])
        if getattr(role, "name", None)
    ]


def _user_role_name_set(user: User) -> set[str]:
    return set(user_role_names(user))


def _require_role(expected_role: str):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if expected_role not in _user_role_name_set(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return current_user

    return checker


def require_any_role(*allowed_roles: str):
    allowed = set(allowed_roles)

    def checker(current_user: User = Depends(get_current_user)) -> User:
        roles = _user_role_name_set(current_user)
        if roles.isdisjoint(allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return current_user

    return checker


require_investigator = _require_role("investigator")
require_iaec = _require_role("iaec")
require_staff = _require_role("staff")
require_admin = _require_role("admin")
require_admin_or_staff = require_any_role("admin", "staff")