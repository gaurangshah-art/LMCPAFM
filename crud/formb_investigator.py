from __future__ import annotations

from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.formb_membership import default_permissions_for_type, get_editable_form_b, get_member_form_b
from database.lmcpafm_models import FormBInvestigator
from models.user import User


def list_form_b_investigators(db: Session, user: User, form_b_id: int) -> list[FormBInvestigator]:
    get_member_form_b(db, user, form_b_id)
    return (
        db.query(FormBInvestigator)
        .filter(FormBInvestigator.form_b_id == form_b_id)
        .order_by(FormBInvestigator.id.asc())
        .all()
    )


def add_form_b_investigator(db: Session, user: User, payload: dict) -> FormBInvestigator:
    form_b_id = payload["form_b_id"]
    get_editable_form_b(db, user, form_b_id)

    defaults = default_permissions_for_type(payload.get("investigator_type"))
    investigator = FormBInvestigator(
        form_b_id=form_b_id,
        name=payload["name"],
        project_role=payload.get("project_role") or payload.get("role"),
        user_id=payload.get("user_id"),
        investigator_profile_user_id=payload.get("user_id"),
        investigator_type=payload.get("investigator_type"),
        can_view_status=payload["can_view_status"] if payload.get("can_view_status") is not None else defaults["can_view_status"],
        can_view_approval_letters=payload["can_view_approval_letters"] if payload.get("can_view_approval_letters") is not None else defaults["can_view_approval_letters"],
        can_edit_forms=payload["can_edit_forms"] if payload.get("can_edit_forms") is not None else defaults["can_edit_forms"],
        can_submit_form_b=payload["can_submit_form_b"] if payload.get("can_submit_form_b") is not None else defaults["can_submit_form_b"],
    )
    db.add(investigator)
    db.commit()
    db.refresh(investigator)
    return investigator


def remove_form_b_investigator(
    db: Session,
    user: User,
    form_b_id: int,
    investigator_id: int,
) -> None:
    get_editable_form_b(db, user, form_b_id)
    investigator = (
        db.query(FormBInvestigator)
        .filter(
            FormBInvestigator.id == investigator_id,
            FormBInvestigator.form_b_id == form_b_id,
        )
        .first()
    )
    if investigator is None:
        raise CRUDValidationError("Investigator not found on this Form B")
    if investigator.project_role == "principal_investigator":
        raise CRUDValidationError("Cannot remove the principal investigator")

    db.delete(investigator)
    db.commit()
