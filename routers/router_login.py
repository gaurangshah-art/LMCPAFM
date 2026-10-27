from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from crud.activity_log import record_activity
from crud.exceptions import CRUDValidationError
from crud.investigator_registration import register_investigator
from crud.password_reset import request_password_reset, reset_password_with_token
from database.database import get_db
from models.user import User
from schemas.schemas_auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    InvestigatorRegisterRequest,
    InvestigatorRegisterResponse,
    LoginRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from dependencies.auth import get_current_user
from utils.security import create_access_token, hash_password, verify_password

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

    record_activity(
        db,
        user=user,
        action="investigator.registered",
        details=f"Investigator self-registration for {user.email}",
    )

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
    record_activity(
        db,
        user=user,
        action="auth.login",
        details=f"Successful login for {user.email}",
    )
    return TokenResponse(access_token=token)


@router.post("/refresh", response_model=TokenResponse)
def refresh_session(current_user: User = Depends(get_current_user)):
    """Issue a new access token while the current one is still valid."""
    token = create_access_token({"sub": str(current_user.id), "email": current_user.email})
    return TokenResponse(access_token=token)


FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, password reset instructions have been sent."
)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    try:
        request_password_reset(db, str(payload.email))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send password reset email. Try again or contact your administrator.",
        ) from exc

    return ForgotPasswordResponse(message=FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        user = reset_password_with_token(
            db,
            plain_token=payload.token,
            new_password=payload.new_password,
        )
        db.commit()
    except CRUDValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    record_activity(
        db,
        user=user,
        action="auth.password_reset",
        details=f"Password reset via email link for {user.email}",
    )
    db.commit()


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must differ from your current password",
        )

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.add(current_user)
    db.commit()

    record_activity(
        db,
        user=current_user,
        action="auth.password_changed",
        details=f"Password changed for {current_user.email}",
    )
