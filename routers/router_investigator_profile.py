from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.investigator_profile import get_or_create_profile, profile_to_read, update_profile
from database.database import get_db
from dependencies.auth import get_current_user, require_investigator
from models.user import User
from schemas.schemas_investigator_profile import InvestigatorProfileRead, InvestigatorProfileUpdate

router = APIRouter(prefix="/investigator-profile", tags=["Investigator Profile"])


@router.get("/me", response_model=InvestigatorProfileRead)
def read_my_investigator_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    profile = get_or_create_profile(db, current_user.id)
    return profile_to_read(profile)


@router.put("/me", response_model=InvestigatorProfileRead)
def update_my_investigator_profile(
    payload: InvestigatorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    try:
        profile = update_profile(db, current_user.id, payload)
        return profile_to_read(profile)
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
