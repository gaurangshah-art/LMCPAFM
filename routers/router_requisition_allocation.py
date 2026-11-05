from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from crud.crud_requisition_allocation import (
    amend_requisition,
    cancel_requisition,
    create_requisition,
    create_allocation,
    get_requisition,
    get_allocation,
    get_requisition_manage_flags,
)
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from schemas.schemas_requisition_allocation import (
    AnimalRequisitionAmend,
    AnimalRequisitionCreate,
    AnimalRequisitionCreateInternal,
    AnimalRequisition,
    AnimalAllocationCreate,
    AnimalAllocation,
)
from dependencies.auth import (
    require_any_role,
    require_investigator_requisition_access,
    user_role_names,
)
from models.user import User

router = APIRouter(prefix="/iaec", tags=["IAEC Workflow"])


def _requisition_response(db, requisition, current_user: User) -> AnimalRequisition:
    flags = get_requisition_manage_flags(db, requisition, current_user)
    payload = AnimalRequisition.model_validate(requisition).model_dump()
    payload.update(flags)
    return AnimalRequisition(**payload)


def _current_user_roles(current_user: User) -> list[str]:
    return user_role_names(current_user)


# =========================================================
# SUBMIT REQUISITION
# =========================================================

@router.post("/requisition", response_model=AnimalRequisition)
def submit_requisition(
    req: AnimalRequisitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("investigator")),
    _animal_access: User = Depends(require_investigator_requisition_access),
):
    try:
        # Force requester metadata from authenticated user (ignore client spoofing)
        roles = _current_user_roles(current_user)
        req_payload = req.model_dump()
        req_payload["requester_user_id"] = current_user.id
        req_payload["requester_name"] = current_user.name
        req_payload["requester_role"] = roles[0] if roles else "investigator"

        req_final = AnimalRequisitionCreateInternal(**req_payload)

        created = create_requisition(db, req_final)
        return _requisition_response(db, created, current_user)
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/requisition/{req_id}", response_model=AnimalRequisition)
def update_requisition(
    req_id: int,
    payload: AnimalRequisitionAmend,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("investigator")),
    _animal_access: User = Depends(require_investigator_requisition_access),
):
    try:
        updated = amend_requisition(
            db,
            req_id,
            current_user,
            date=payload.date,
            purpose=payload.purpose,
            items=payload.items,
        )
        return _requisition_response(db, updated, current_user)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error") from exc


@router.post("/requisition/{req_id}/cancel", response_model=AnimalRequisition)
def cancel_requisition_route(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("investigator")),
    _animal_access: User = Depends(require_investigator_requisition_access),
):
    try:
        cancelled = cancel_requisition(db, req_id, current_user)
        return _requisition_response(db, cancelled, current_user)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error") from exc


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
    _animal_access: User = Depends(require_investigator_requisition_access),
):
    req = get_requisition(db, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found.")
    return _requisition_response(db, req, current_user)


# =========================================================
# GET ALLOCATION
# =========================================================

@router.get("/allocation/{alloc_id}", response_model=AnimalAllocation)
def read_allocation(
    alloc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("investigator", "iaec", "staff")),
    _animal_access: User = Depends(require_investigator_requisition_access),
):
    alloc = get_allocation(db, alloc_id)
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found.")
    return alloc