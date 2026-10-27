from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from crud.activity_log import record_activity
from crud.investigator_profile import create_profile_shell
from database.database import get_db
from models.role import Role
from models.user import User
from schemas.schemas_users import UserCreate, UserRead
from utils.institutional_email import is_lmcp_institutional_email, normalize_email
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
    normalized_email = normalize_email(str(payload.email))
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    if not payload.roles:
        raise HTTPException(status_code=400, detail="At least one role is required")

    role_names = [r.value for r in payload.roles]
    if "investigator" in role_names and not is_lmcp_institutional_email(normalized_email):
        raise HTTPException(
            status_code=400,
            detail="Investigator accounts require an LMCP institutional email address.",
        )
    certified = bool(payload.is_certified_animal_handler)
    if certified and "investigator" not in role_names:
        raise HTTPException(
            status_code=400,
            detail="Animal-handling certification applies only to investigator accounts.",
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
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=hash_password(payload.password),
        status=payload.status,
        must_change_password=True,
        is_certified_animal_handler=certified,
    )
    user.roles = db_roles

    db.add(user)
    db.flush()
    if "investigator" in role_names:
        create_profile_shell(db, user, is_lmcp_faculty=True)
    db.commit()
    db.refresh(user)
    record_activity(
        db,
        user=_current_user,
        action="user.created",
        details=f"Created user {user.email} with roles {', '.join(role_names)}",
    )
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "roles": [r.name for r in user.roles],
        "status": user.status,
        "must_change_password": user.must_change_password,
        "is_certified_animal_handler": user.is_certified_animal_handler,
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
            "must_change_password": u.must_change_password,
            "is_certified_animal_handler": u.is_certified_animal_handler,
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
        "must_change_password": current_user.must_change_password,
        "is_certified_animal_handler": current_user.is_certified_animal_handler,
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
