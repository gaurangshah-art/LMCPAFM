from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import SessionLocal
from crud.crud_disposal import create_disposal, get_disposal
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from schemas.schemas_disposal import DisposalCreate, Disposal


router = APIRouter(prefix="/disposal", tags=["Disposal Workflow"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=Disposal)
def submit_disposal(disp: DisposalCreate, db: Session = Depends(get_db)):
    try:
        return create_disposal(db, disp)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError as exc:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{disp_id}", response_model=Disposal)
def read_disposal(disp_id: int, db: Session = Depends(get_db)):
    db_disp = get_disposal(db, disp_id)
    if not db_disp:
        raise HTTPException(status_code=404, detail="Disposal record not found.")
    return db_disp
