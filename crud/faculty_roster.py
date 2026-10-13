from __future__ import annotations

from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from database.lmcpafm_models import FacultyRosterEntry
from utils.faculty_roster_policy import is_faculty_roster_enforced
from utils.institutional_email import normalize_email


def is_email_on_active_faculty_roster(db: Session, email: str) -> bool:
    normalized = normalize_email(email)
    row = (
        db.query(FacultyRosterEntry)
        .filter(
            FacultyRosterEntry.email == normalized,
            FacultyRosterEntry.active.is_(True),
        )
        .first()
    )
    return row is not None


def assert_investigator_registration_allowed(db: Session, email: str) -> None:
    if not is_faculty_roster_enforced():
        return

    if not is_email_on_active_faculty_roster(db, email):
        raise CRUDValidationError(
            "This email is not on the approved faculty roster. "
            "Contact the LMCPAFM administrator to be added, or use the staff account "
            "created for you if you are facility support staff."
        )


def count_active_roster_entries(db: Session) -> int:
    return (
        db.query(FacultyRosterEntry)
        .filter(FacultyRosterEntry.active.is_(True))
        .count()
    )
