from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.faculty_roster import assert_investigator_registration_allowed
from crud.investigator_profile import create_profile_shell
from models.role import Role
from models.user import User
from utils.institutional_email import is_lmcp_institutional_email, normalize_email
from utils.security import hash_password

INVESTIGATOR_ROLE = "investigator"


def _get_or_create_investigator_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == INVESTIGATOR_ROLE).first()
    if role:
        return role

    role = Role(name=INVESTIGATOR_ROLE)
    db.add(role)
    db.flush()
    return role


def register_investigator(
    db: Session,
    name: str,
    email: str,
    password: str,
    *,
    account_type: str = "faculty",
) -> User:
    normalized_email = normalize_email(email)
    normalized_name = name.strip()

    if not normalized_name:
        raise CRUDValidationError("Name is required.")

    if not password:
        raise CRUDValidationError("Password is required.")

    is_student = account_type == "student"
    if not is_student:
        if not is_lmcp_institutional_email(normalized_email):
            raise CRUDValidationError(
                "Registration is restricted to LMCP institutional email addresses."
            )
        assert_investigator_registration_allowed(db, normalized_email)

    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise CRUDValidationError("Email already exists")

    investigator_role = _get_or_create_investigator_role(db)
    user = User(
        name=normalized_name,
        email=normalized_email,
        password_hash=hash_password(password),
        status=True,
    )
    user.roles = [investigator_role]

    db.add(user)
    db.flush()
    create_profile_shell(
        db,
        user,
        is_lmcp_faculty=not is_student,
        is_self_registered_scholar=is_student,
    )
    db.commit()
    db.refresh(user)
    return user


def register_student_scholar(db: Session, name: str, email: str, password: str) -> User:
    """Self-registration for scholars without an @lmcp.ac.in mailbox."""
    return register_investigator(
        db,
        name=name,
        email=email,
        password=password,
        account_type="student",
    )
