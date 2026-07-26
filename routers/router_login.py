from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.investigator_registration import register_investigator
from database.database import get_db
from models.user import User
from schemas.schemas_auth import (
    InvestigatorRegisterRequest,
    InvestigatorRegisterResponse,
    LoginRequest,
    TokenResponse,
)
from utils.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register-investigator",
    response_model=InvestigatorRegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_investigator_account(
    payload: InvestigatorRegisterRequest,
    db: Session = Depends(get_db),
):
    try:
        user = register_investigator(
            db,
            name=payload.name,
            email=str(payload.email),
            password=payload.password,
        )
    except CRUDValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "roles": [role.name for role in user.roles],
        "status": user.status,
    }


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User inactive",
        )

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)
