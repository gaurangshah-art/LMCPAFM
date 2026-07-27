from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy import or_

from crud.exceptions import CRUDValidationError
from database.lmcpafm_models import FormB, FormBInvestigator
from models.investigator_profile import InvestigatorProfile
from models.user import User


def get_form_b_membership(db: Session, user: User, form_b_id: int) -> FormBInvestigator:
    membership = (
        db.query(FormBInvestigator)
        .filter(
            FormBInvestigator.form_b_id == form_b_id,
            FormBInvestigator.user_id == user.id,
        )
        .first()
    )
    if membership is None:
        raise CRUDValidationError("You are not allowed to access this Form B")
    return membership


def get_member_form_b(db: Session, user: User, form_b_id: int) -> FormB:
    form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
    if form_b is None:
        raise CRUDValidationError("Form B not found")

    membership = get_form_b_membership(db, user, form_b_id)
    if not _can_view_form_b(membership):
        raise CRUDValidationError("You do not have permission to view this Form B")

    return form_b


def get_editable_form_b(db: Session, user: User, form_b_id: int) -> FormB:
    form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
    if form_b is None:
        raise CRUDValidationError("Form B not found")

    membership = get_form_b_membership(db, user, form_b_id)
    if form_b.submitted_at is not None:
        raise CRUDValidationError("Form B has already been submitted")
    if not membership.can_edit_forms:
        raise CRUDValidationError("You do not have permission to edit this Form B")

    return form_b


def assert_can_submit(db: Session, user: User, form_b_id: int) -> FormB:
    form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
    if form_b is None:
        raise CRUDValidationError("Form B not found")

    membership = get_form_b_membership(db, user, form_b_id)
    if form_b.submitted_at is not None:
        raise CRUDValidationError("Form B has already been submitted")
    if not membership.can_submit_form_b:
        raise CRUDValidationError("You do not have permission to submit this Form B")

    return form_b


def _can_view_form_b(membership: FormBInvestigator) -> bool:
    return any(
        (
            membership.can_view_status,
            membership.can_edit_forms,
            membership.can_submit_form_b,
            membership.can_view_approval_letters,
        )
    )


def default_permissions_for_type(investigator_type: str | None) -> dict[str, bool]:
    normalized = (investigator_type or "investigator").strip().lower()
    if normalized == "student":
        return {
            "can_view_status": False,
            "can_view_approval_letters": False,
            "can_edit_forms": True,
            "can_submit_form_b": False,
        }
    if normalized == "faculty":
        return {
            "can_view_status": True,
            "can_view_approval_letters": True,
            "can_edit_forms": True,
            "can_submit_form_b": True,
        }
    return {
        "can_view_status": True,
        "can_view_approval_letters": False,
        "can_edit_forms": True,
        "can_submit_form_b": False,
    }


def form_b_has_lmcp_faculty(db: Session, form_b: FormB) -> bool:
    investigators = (
        db.query(FormBInvestigator)
        .filter(FormBInvestigator.form_b_id == form_b.id)
        .all()
    )
    for investigator in investigators:
        if (investigator.investigator_type or "").strip().lower() == "faculty":
            return True
        if investigator.user_id is None:
            continue
        profile = (
            db.query(InvestigatorProfile)
            .filter(InvestigatorProfile.user_id == investigator.user_id)
            .first()
        )
        if profile and profile.is_lmcp_faculty:
            return True
    return False


def user_can_view_project(db: Session, user_id: int, project_id: int) -> bool:
    membership = (
        db.query(FormBInvestigator)
        .join(FormB, FormB.id == FormBInvestigator.form_b_id)
        .filter(
            FormB.project_id == project_id,
            FormBInvestigator.user_id == user_id,
        )
        .first()
    )
    if membership is None:
        return False
    return _can_view_form_b(membership)


def user_can_view_approval_letter(db: Session, user_id: int, project_id: int) -> bool:
    membership = (
        db.query(FormBInvestigator)
        .join(FormB, FormB.id == FormBInvestigator.form_b_id)
        .filter(
            FormB.project_id == project_id,
            FormBInvestigator.user_id == user_id,
            FormBInvestigator.can_view_approval_letters.is_(True),
        )
        .first()
    )
    return membership is not None


def user_can_edit_project(db: Session, user_id: int, project_id: int) -> bool:
    membership = (
        db.query(FormBInvestigator)
        .join(FormB, FormB.id == FormBInvestigator.form_b_id)
        .filter(
            FormB.project_id == project_id,
            FormBInvestigator.user_id == user_id,
            FormBInvestigator.can_edit_forms.is_(True),
        )
        .first()
    )
    return membership is not None
