from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from crud.crud_inventory import get_form_c_data
from database.database import get_db
from dependencies.auth import require_any_role
from models.user import User
from schemas.schemas_inventory import FormCData

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/form-c-data", response_model=FormCData)
def read_form_c_data(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "iaec", "admin")),
):
    return get_form_c_data(db)
