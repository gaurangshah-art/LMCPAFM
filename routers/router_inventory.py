from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from crud.crud_inventory import get_form_c_data
from database.database import SessionLocal
from schemas.schemas_inventory import FormCData

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/form-c-data", response_model=FormCData)
def read_form_c_data(db: Session = Depends(get_db)):
    return get_form_c_data(db)
