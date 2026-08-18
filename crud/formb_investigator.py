from __future__ import annotations

from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.formb_membership import default_permissions_for_type, get_editable_form_b, get_member_form_b
from database.lmcpafm_models import FormBInvestigator
from models.investigator_profile import InvestigatorProfile
from models.role import Role
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

    linked_user_id = payload.get("user_id")
    linked_user = None
    if linked_user_id is not None:
        linked_user = _get_linkable_investigator_user(db, linked_user_id)
        _assert_user_not_already_on_form_b(db, form_b_id, linked_user_id)

    defaults = default_permissions_for_type(payload.get("investigator_type"))
    investigator = FormBInvestigator(
        form_b_id=form_b_id,
        name=(linked_user.name if linked_user else payload["name"]),
        project_role=payload.get("project_role") or payload.get("role"),
        user_id=linked_user_id,
        investigator_profile_user_id=linked_user_id,
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


def _get_linkable_investigator_user(db: Session, user_id: int) -> User:
    target = db.query(User).filter(User.id == user_id, User.status.is_(True)).first()
    if target is None:
        raise CRUDValidationError("Selected user account was not found or is inactive.")

    role_names = {role.name for role in target.roles}
    if "investigator" not in role_names:
        raise CRUDValidationError("Only registered investigator accounts can be linked.")

    return target


def _assert_user_not_already_on_form_b(db: Session, form_b_id: int, user_id: int) -> None:
    existing = (
        db.query(FormBInvestigator)
        .filter(
            FormBInvestigator.form_b_id == form_b_id,
            FormBInvestigator.user_id == user_id,
        )
        .first()
    )
    if existing is not None:
        raise CRUDValidationError("This user is already linked to the Form B project team.")


def search_linkable_investigator_users(
    db: Session,
    query: str,
    limit: int = 20,
) -> list[User]:
    normalized = (query or "").strip()
    if len(normalized) < 2:
        return []

    pattern = f"%{normalized}%"
    return (
        db.query(User)
        .join(User.roles)
        .filter(Role.name == "investigator", User.status.is_(True))
        .filter((User.name.ilike(pattern)) | (User.email.ilike(pattern)))
        .order_by(User.name.asc(), User.id.asc())
        .limit(limit)
        .all()
    )


def link_form_b_investigator(
    db: Session,
    user: User,
    form_b_id: int,
    investigator_id: int,
    user_id: int,
) -> FormBInvestigator:
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

    if investigator.user_id == user_id:
        return investigator

    _assert_user_not_already_on_form_b(db, form_b_id, user_id)
    linked_user = _get_linkable_investigator_user(db, user_id)

    investigator.user_id = linked_user.id
    investigator.investigator_profile_user_id = linked_user.id
    investigator.name = linked_user.name

    profile = (
        db.query(InvestigatorProfile)
        .filter(InvestigatorProfile.user_id == linked_user.id)
        .first()
    )
    if profile is not None and investigator.investigator_type in (None, "", "external"):
        if profile.is_lmcp_faculty:
            investigator.investigator_type = "faculty"

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
