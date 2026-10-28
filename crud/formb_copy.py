from __future__ import annotations

import copy
from datetime import date, datetime, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from crud.exceptions import CRUDValidationError
from crud.formb_membership import get_form_b_membership, get_member_form_b
from crud.formb_study_plan import build_study_plan_save_payload, save_study_plan
from crud.formb_wizard import _sync_animal_requirements, start_form_b
from database.lmcpafm_models import (
    FormB,
    FormBDrugInjection,
    FormBInvestigator,
    IAECProject,
)
from models.user import User

_COPYABLE_PROJECT_STATUSES = frozenset({"approved", "submitted", "pending"})


def _source_eligible_for_copy(source: FormB) -> bool:
    if source.submitted_at is not None:
        return True
    project = source.project
    if project is None:
        return False
    status = (project.status or "").strip().lower()
    return status in _COPYABLE_PROJECT_STATUSES


def list_form_b_copy_sources(db: Session, user: User) -> list[dict]:
    rows = (
        db.query(FormB, IAECProject)
        .join(FormBInvestigator, FormBInvestigator.form_b_id == FormB.id)
        .join(IAECProject, IAECProject.id == FormB.project_id)
        .filter(FormBInvestigator.user_id == user.id)
        .filter(
            or_(
                FormB.submitted_at.isnot(None),
                func.lower(func.coalesce(IAECProject.status, "")).in_(
                    tuple(_COPYABLE_PROJECT_STATUSES)
                ),
            )
        )
        .order_by(FormB.submitted_at.desc().nullslast(), FormB.id.desc())
        .all()
    )
    seen: set[int] = set()
    results: list[dict] = []
    for form_b, project in rows:
        if form_b.id in seen:
            continue
        seen.add(form_b.id)
        results.append(
            {
                "form_b_id": form_b.id,
                "project_id": project.id,
                "title": project.title or "Untitled protocol",
                "protocol_number": project.protocol_number,
                "submitted_at": form_b.submitted_at,
                "status": project.status,
            }
        )
    return results


def _copy_investigators(
    db: Session,
    source: FormB,
    target: FormB,
    user: User,
) -> None:
    source_rows = (
        db.query(FormBInvestigator)
        .filter(FormBInvestigator.form_b_id == source.id)
        .order_by(FormBInvestigator.id.asc())
        .all()
    )
    db.query(FormBInvestigator).filter(FormBInvestigator.form_b_id == target.id).delete()
    db.flush()

    for row in source_rows:
        db.add(
            FormBInvestigator(
                form_b_id=target.id,
                name=row.name,
                project_role=row.project_role,
                user_id=row.user_id,
                investigator_profile_user_id=row.investigator_profile_user_id,
                investigator_type=row.investigator_type,
                can_view_status=row.can_view_status,
                can_view_approval_letters=row.can_view_approval_letters,
                can_edit_forms=row.can_edit_forms,
                can_submit_form_b=row.can_submit_form_b,
            )
        )

    membership = (
        db.query(FormBInvestigator)
        .filter(
            FormBInvestigator.form_b_id == target.id,
            FormBInvestigator.user_id == user.id,
        )
        .first()
    )
    if membership and not membership.can_edit_forms:
        membership.can_edit_forms = True
    if (
        membership
        and membership.project_role == "principal_investigator"
        and not membership.can_submit_form_b
    ):
        membership.can_submit_form_b = True


def _apply_copied_application_data(
    source: FormB,
    target: FormB,
    user: User,
) -> dict:
    copied = copy.deepcopy(source.application_data or {})
    source_project = source.project
    protocol_ref = (source_project.protocol_number if source_project else None) or str(source.id)
    copied["_copied_from"] = {
        "source_form_b_id": source.id,
        "source_project_id": source.project_id,
        "source_protocol_number": source_project.protocol_number if source_project else None,
        "copied_at": datetime.now(timezone.utc).isoformat(),
        "copied_by_user_id": user.id,
    }

    step2 = dict(copied.get("step2") or {})
    if step2.get("title"):
        step2["title"] = str(step2["title"]).strip()
    renewal_note = (
        f"Renewal/amendment based on prior protocol {protocol_ref}. "
        "Update dates, animal numbers, and scientific details before submission."
    )
    summary = str(step2.get("summary") or "").strip()
    if renewal_note not in summary:
        step2["summary"] = f"{renewal_note}\n\n{summary}".strip() if summary else renewal_note
    copied["step2"] = step2
    return copied


def _sync_project_from_step2(db: Session, target: FormB, application_data: dict) -> None:
    project = db.query(IAECProject).filter(IAECProject.id == target.project_id).first()
    if project is None:
        return
    step2 = application_data.get("step2") or {}
    if isinstance(step2, dict):
        title = (step2.get("title") or "").strip()
        if title:
            project.title = title
        objectives = (step2.get("objectives") or "").strip()
        if objectives:
            project.objective = objectives
        summary = (step2.get("summary") or "").strip()
        if summary:
            project.purpose = summary
    project.status = "draft"
    project.protocol_number = None
    project.approval_date = None


def copy_form_b(db: Session, user: User, source_form_b_id: int) -> dict:
    source = (
        db.query(FormB)
        .options(joinedload(FormB.project))
        .filter(FormB.id == source_form_b_id)
        .first()
    )
    if source is None:
        raise CRUDValidationError("Form B not found.")
    get_member_form_b(db, user, source_form_b_id)

    if not _source_eligible_for_copy(source):
        raise CRUDValidationError(
            "Copy is available only for submitted or IAEC-reviewed protocols."
        )

    target = start_form_b(db, user, force_new=True)

    application_data = _apply_copied_application_data(source, target, user)
    target.application_data = application_data
    target.date = date.today()
    target.meeting_id = None
    target.submitted_at = None

    _sync_project_from_step2(db, target, application_data)
    _copy_investigators(db, source, target, user)

    for existing in list(target.animal_requirements):
        db.delete(existing)
    for existing in list(target.drug_injections):
        db.delete(existing)
    db.flush()

    db.flush()

    study_payload = build_study_plan_save_payload(db, source.id)
    if study_payload is not None:
        study_payload.form_b_id = target.id
        save_study_plan(db, user, study_payload)
        target = db.query(FormB).filter(FormB.id == target.id).first() or target
    else:
        step3 = application_data.get("step3") or {}
        if step3:
            _sync_animal_requirements(db, target, step3)

    for row in source.drug_injections:
        db.add(
            FormBDrugInjection(
                form_b_id=target.id,
                drug_name=row.drug_name,
                dose=row.dose,
            )
        )
    db.commit()
    db.refresh(target)

    source_protocol = source.project.protocol_number if source.project else None
    return {
        "id": target.id,
        "project_id": target.project_id,
        "source_form_b_id": source.id,
        "source_protocol_number": source_protocol,
        "attachments_not_copied": True,
        "funding_proof_not_copied": True,
    }
