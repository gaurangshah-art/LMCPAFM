from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.database import get_db
from database.lmcpafm_models import IAECProject
from database.lmcpafm_requisition_allocation import AnimalRequisition
from database.lmcpafm_experiments import Experiment
from dependencies.auth import require_admin_or_staff
from models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/summary")
def read_system_summary(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin_or_staff),
):
    return {
        "total_users": db.query(User).count(),
        "total_projects": db.query(IAECProject).count(),
        "total_requisitions": db.query(AnimalRequisition).count(),
        "total_allocations": 0,
        "total_experiments": db.query(Experiment).count(),
    }


@router.get("/logs")
def read_activity_logs(_current_user: User = Depends(require_admin_or_staff)):
    return []


@router.get("/users")
def read_admin_users(
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


@router.put("/users/{user_id}/roles")
def update_user_roles(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin_or_staff),
):
    from models.role import Role

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    role_names = payload.get("roles") or []
    if "investigator" in role_names:
        raise HTTPException(
            status_code=400,
            detail="Use investigator self-registration for investigator accounts.",
        )

    db_roles = []
    for name in role_names:
        role = db.query(Role).filter(Role.name == name).first()
        if role is None:
            role = Role(name=name)
            db.add(role)
            db.flush()
        db_roles.append(role)

    user.roles = db_roles
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "roles": [r.name for r in user.roles],
        "status": user.status,
    }
