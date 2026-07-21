from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from crud.crud_requisition_allocation import (
    create_requisition,
    create_allocation,
    get_requisition,
    get_allocation,
)
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from schemas.schemas_requisition_allocation import (
    AnimalRequisitionCreate,
    AnimalRequisitionCreateInternal,
    AnimalRequisition,
    AnimalAllocationCreate,
    AnimalAllocation,
)
from dependencies.auth import require_any_role
from models.user import User

router = APIRouter(prefix="/iaec", tags=["IAEC Workflow"])


def _current_user_roles(current_user: User) -> list[str]:
    roles = [r.name for r in getattr(current_user, "roles", []) or []]
    if not roles and getattr(current_user, "role", None):
        roles = [str(current_user.role)]
    return roles


# =========================================================
# SUBMIT REQUISITION
# =========================================================

@router.post("/requisition", response_model=AnimalRequisition)
def submit_requisition(
    req: AnimalRequisitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("investigator", "iaec", "staff")),
):
    try:
        # Force requester metadata from authenticated user (ignore client spoofing)
        roles = _current_user_roles(current_user)
        req_payload = req.model_dump()
        req_payload["requester_user_id"] = current_user.id
        req_payload["requester_name"] = current_user.name
        req_payload["requester_role"] = roles[0] if roles else "investigator"

        req_final = AnimalRequisitionCreateInternal(**req_payload)

        return create_requisition(db, req_final)
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# =========================================================
# SUBMIT ALLOCATION
# =========================================================

@router.post("/allocation", response_model=AnimalAllocation)
def submit_allocation(
    alloc: AnimalAllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("iaec", "staff")),
):
    try:
        return create_allocation(db, alloc)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# =========================================================
# GET REQUISITION
# =========================================================

@router.get("/requisition/{req_id}", response_model=AnimalRequisition)
def read_requisition(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("investigator", "iaec", "staff")),
):
    req = get_requisition(db, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found.")
    return req


# =========================================================
# GET ALLOCATION
# =========================================================

@router.get("/allocation/{alloc_id}", response_model=AnimalAllocation)
def read_allocation(
    alloc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("investigator", "iaec", "staff")),
):
    alloc = get_allocation(db, alloc_id)
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found.")
    return alloc