from datetime import datetime, timezone

from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from models.investigator_profile import InvestigatorProfile
from models.user import User
from schemas.schemas_investigator_profile import InvestigatorProfileUpdate
from utils.institutional_email import is_lmcp_institutional_email, normalize_email

REQUIRED_PROFILE_FIELDS = (
    "institution_name",
    "department",
    "designation",
    "qualification",
)


def is_profile_complete(profile: InvestigatorProfile) -> bool:
    for field in REQUIRED_PROFILE_FIELDS:
        value = getattr(profile, field, None)
        if value is None or not str(value).strip():
            return False
    if not profile.institutional_email or not str(profile.institutional_email).strip():
        return False
    return True


def profile_to_read(profile: InvestigatorProfile) -> dict:
    return {
        "user_id": profile.user_id,
        "institutional_email": profile.institutional_email,
        "institution_name": profile.institution_name,
        "department": profile.department,
        "designation": profile.designation,
        "age": profile.age,
        "qualification": profile.qualification,
        "years_experience": profile.years_experience,
        "animal_handling_experience": profile.animal_handling_experience,
        "is_lmcp_faculty": profile.is_lmcp_faculty,
        "is_complete": is_profile_complete(profile),
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


def create_profile_shell(db: Session, user: User) -> InvestigatorProfile:
    existing = (
        db.query(InvestigatorProfile)
        .filter(InvestigatorProfile.user_id == user.id)
        .first()
    )
    if existing:
        return existing

    profile = InvestigatorProfile(
        user_id=user.id,
        institutional_email=user.email,
        is_lmcp_faculty=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(profile)
    db.flush()
    return profile


def get_or_create_profile(db: Session, user_id: int) -> InvestigatorProfile:
    profile = (
        db.query(InvestigatorProfile)
        .filter(InvestigatorProfile.user_id == user_id)
        .first()
    )
    if profile:
        return profile

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise CRUDNotFoundError("User not found")

    profile = create_profile_shell(db, user)
    db.commit()
    db.refresh(profile)
    return profile


def update_profile(
    db: Session,
    user_id: int,
    payload: InvestigatorProfileUpdate,
) -> InvestigatorProfile:
    profile = get_or_create_profile(db, user_id)
    data = payload.model_dump(exclude_unset=True)

    if "institutional_email" in data and data["institutional_email"] is not None:
        normalized = normalize_email(data["institutional_email"])
        if not is_lmcp_institutional_email(normalized):
            raise CRUDValidationError(
                "Institutional email must use an allowed LMCP domain."
            )
        data["institutional_email"] = normalized

    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip() or None
        setattr(profile, key, value)

    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return profile
