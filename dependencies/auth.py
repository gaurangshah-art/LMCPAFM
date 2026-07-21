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


def _user_role_names(user: User) -> set[str]:
    """
    Supports both:
    - new multi-role model: user.roles -> [Role(name=...)]
    - legacy single-role model: user.role -> "staff"
    """
    names: set[str] = set()

    # Multi-role relation (preferred)
    for r in getattr(user, "roles", []) or []:
        role_name = getattr(r, "name", None)
        if role_name:
            names.add(str(role_name))

    # Legacy fallback
    legacy_role = getattr(user, "role", None)
    if legacy_role:
        names.add(str(legacy_role))

    return names


def _require_role(expected_role: str):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if expected_role not in _user_role_names(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return current_user

    return checker


def require_any_role(*allowed_roles: str):
    allowed = set(allowed_roles)

    def checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = _user_role_names(current_user)
        if user_roles.isdisjoint(allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return current_user

    return checker


require_investigator = _require_role("investigator")
require_iaec = _require_role("iaec")
require_staff = _require_role("staff")