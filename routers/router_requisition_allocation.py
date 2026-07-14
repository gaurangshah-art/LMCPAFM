from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import SessionLocal
from crud.crud_requisition_allocation import (
    create_requisition, create_allocation,
    get_requisition, get_allocation
)
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from schemas.schemas_requisition_allocation import (
    AnimalRequisitionCreate, AnimalRequisition,
    AnimalAllocationCreate, AnimalAllocation
)

router = APIRouter(prefix="/iaec", tags=["IAEC Workflow"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================================================
# SUBMIT REQUISITION
# =========================================================

@router.post("/requisition", response_model=AnimalRequisition)
def submit_requisition(req: AnimalRequisitionCreate, db: Session = Depends(get_db)):
    try:
        return create_requisition(db, req)
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError as exc:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# =========================================================
# SUBMIT ALLOCATION
# =========================================================

@router.post("/allocation", response_model=AnimalAllocation)
def submit_allocation(alloc: AnimalAllocationCreate, db: Session = Depends(get_db)):
    try:
        return create_allocation(db, alloc)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError as exc:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# =========================================================
# GET REQUISITION
# =========================================================

@router.get("/requisition/{req_id}", response_model=AnimalRequisition)
def read_requisition(req_id: int, db: Session = Depends(get_db)):
    req = get_requisition(db, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found.")
    return req


# =========================================================
# GET ALLOCATION
# =========================================================

@router.get("/allocation/{alloc_id}", response_model=AnimalAllocation)
def read_allocation(alloc_id: int, db: Session = Depends(get_db)):
    alloc = get_allocation(db, alloc_id)
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found.")
    return alloc
