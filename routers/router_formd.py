from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import SessionLocal
from crud.crud_formd import get_form_d, get_form_d_generation_data
from crud.exceptions import CRUDNotFoundError
from schemas.schemas_formd import FormD, FormDGenerationDataRead


router = APIRouter(prefix="/formd", tags=["Form-D Report"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/project/{project_id}/generation-data", response_model=FormDGenerationDataRead)
def read_form_d_generation_data(project_id: int, db: Session = Depends(get_db)):
    try:
        return get_form_d_generation_data(db, project_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{protocol_id}", response_model=FormD)
def read_form_d(protocol_id: int, db: Session = Depends(get_db)):
    try:
        return get_form_d(db, protocol_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
