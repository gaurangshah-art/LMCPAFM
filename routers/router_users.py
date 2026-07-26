from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.database import get_db
from models.role import Role
from models.user import User
from schemas.schemas_users import UserCreate, UserRead
from utils.security import hash_password
from dependencies.auth import (
    get_current_user,
    require_admin_or_staff,
    require_iaec,
    require_staff,
    require_investigator,
    require_any_role,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin_or_staff),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    if not payload.roles:
        raise HTTPException(status_code=400, detail="At least one role is required")

    role_names = [r.value for r in payload.roles]
    if "investigator" in role_names:
        raise HTTPException(
            status_code=400,
            detail="Investigator accounts must be created via self-registration.",
        )

    db_roles = db.query(Role).filter(Role.name.in_(role_names)).all()
    found_names = {r.name for r in db_roles}

    for name in role_names:
        if name not in found_names:
            new_role = Role(name=name)
            db.add(new_role)
            db.flush()
            db_roles.append(new_role)
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        status=payload.status,
    )
    user.roles = db_roles

    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "roles": [r.name for r in user.roles],
        "status": user.status,
    }


@router.get("/", response_model=List[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin_or_staff),
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "roles": [r.name for r in u.roles],
            "status": u.status,
        }
        for u in users
    ]


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "roles": [r.name for r in current_user.roles],
        "status": current_user.status,
    }


@router.get("/iaec-only")
def iaec_only(current_user: User = Depends(require_iaec)):
    return {"message": "IAEC access granted"}


@router.get("/staff-only")
def staff_only(current_user: User = Depends(require_staff)):
    return {"message": "Staff access granted"}


@router.get("/investigator-only")
def investigator_only(current_user: User = Depends(require_investigator)):
    return {"message": "Investigator access granted"}


@router.get("/investigator-or-iaec")
def investigator_or_iaec(
    current_user: User = Depends(require_any_role("investigator", "iaec"))
):
    return {"message": "Investigator/IAEC access granted"}
