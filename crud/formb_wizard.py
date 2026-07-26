from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.formb_membership import (
    assert_can_submit,
    form_b_has_lmcp_faculty,
    get_editable_form_b,
    get_member_form_b,
)
from crud.investigator_profile import get_or_create_profile, is_profile_complete
from database.lmcpafm_models import (
    FormB,
    FormBAnimalRequirement,
    FormBInvestigator,
    IAECProject,
    Species,
    Strain,
)
from models.user import User

STEP_KEYS = ("step1", "step2", "step3", "step4", "step5", "step6", "step7")


def _format_experience(profile) -> str | None:
    parts: list[str] = []
    if profile.years_experience is not None:
        parts.append(f"{profile.years_experience} year(s) of research experience")
    if profile.animal_handling_experience and str(profile.animal_handling_experience).strip():
        parts.append(str(profile.animal_handling_experience).strip())
    if not parts:
        return None
    return ". ".join(parts)


def build_form_b_step1_autofill(db: Session, user: User) -> dict:
    profile = get_or_create_profile(db, user.id)
    return {
        "establishment_name": profile.institution_name or "LMCP",
        "registration_number": None,
        "principal_investigator": user.name,
        "designation": profile.designation,
        "department": profile.department,
        "contact_email": profile.institutional_email or user.email,
        "contact_phone": None,
        "qualifications": profile.qualification,
        "experience": _format_experience(profile),
        "profile_complete": is_profile_complete(profile),
    }


def _set_step_data(form_b: FormB, step_key: str, data: dict) -> None:
    application_data = dict(form_b.application_data or {})
    application_data[step_key] = data
    form_b.application_data = application_data


def _sync_animal_requirement(db: Session, form_b: FormB, payload: dict) -> None:
    species = (
        db.query(Species)
        .filter(Species.name.ilike(payload["species"].strip()))
        .first()
    )
    strain = (
        db.query(Strain)
        .filter(Strain.name.ilike(payload["strain"].strip()))
        .first()
        if species
        else None
    )
    if strain and strain.species_id != species.id:
        strain = None

    if not species or not strain:
        return

    for existing in list(form_b.animal_requirements):
        db.delete(existing)
    db.flush()

    db.add(
        FormBAnimalRequirement(
            form_b_id=form_b.id,
            species_id=species.id,
            strain_id=strain.id,
            count=int(payload["number_required"]),
        )
    )


def start_form_b(db: Session, user: User) -> FormB:
    profile = get_or_create_profile(db, user.id)
    if not is_profile_complete(profile):
        raise CRUDValidationError(
            "Complete your investigator profile before starting Form B."
        )

    project = IAECProject(
        title="Draft Form B application",
        investigator_name=user.name,
        principal_investigator=user.name,
        status="draft",
    )
    db.add(project)
    db.flush()

    form_b = FormB(project_id=project.id, date=date.today(), application_data={})
    db.add(form_b)
    db.flush()

    investigator = FormBInvestigator(
        form_b_id=form_b.id,
        name=user.name,
        role="principal_investigator",
        user_id=user.id,
        investigator_type="faculty" if profile.is_lmcp_faculty else "investigator",
        can_view_status=True,
        can_view_approval_letters=True,
        can_edit_forms=True,
        can_submit_form_b=True,
    )
    db.add(investigator)
    db.commit()
    db.refresh(form_b)
    return form_b


def save_form_b_step1(db: Session, user: User, form_b_id: int, payload: dict) -> FormB:
    form_b = get_editable_form_b(db, user, form_b_id)
    project = db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()
    if project is None:
        raise CRUDValidationError("Linked project not found")

    step_payload = {
        "establishment_name": payload["establishment_name"],
        "registration_number": payload["registration_number"],
        "principal_investigator": payload["principal_investigator"],
        "designation": payload["designation"],
        "department": payload["department"],
        "contact_email": payload["contact_email"],
        "contact_phone": payload["contact_phone"],
        "qualifications": payload["qualifications"],
        "experience": payload.get("experience") or "",
    }
    _set_step_data(form_b, "step1", step_payload)

    project.investigator_name = payload["principal_investigator"]
    project.principal_investigator = payload["principal_investigator"]
    project.purpose = payload.get("experience") or project.purpose

    membership = (
        db.query(FormBInvestigator)
        .filter(
            FormBInvestigator.form_b_id == form_b_id,
            FormBInvestigator.user_id == user.id,
        )
        .first()
    )
    if membership:
        membership.name = payload["principal_investigator"]

    db.commit()
    db.refresh(form_b)
    return form_b


def save_form_b_step(db: Session, user: User, form_b_id: int, step_key: str, data: dict) -> FormB:
    if step_key not in STEP_KEYS:
        raise CRUDValidationError("Invalid Form B step")

    form_b = get_editable_form_b(db, user, form_b_id)
    _set_step_data(form_b, step_key, data)

    if step_key == "step2":
        project = db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()
        if project:
            project.title = data["title"]
            project.objective = data["objectives"]
            project.purpose = data["summary"]

    if step_key == "step3":
        _sync_animal_requirement(db, form_b, data)

    db.commit()
    db.refresh(form_b)
    return form_b


def get_form_b_review(db: Session, user: User, form_b_id: int) -> dict:
    form_b = get_member_form_b(db, user, form_b_id)
    application_data = form_b.application_data or {}
    return {
        "form_b_id": form_b.id,
        "submitted": form_b.submitted_at is not None,
        "step1": application_data.get("step1"),
        "step2": application_data.get("step2"),
        "step3": application_data.get("step3"),
        "step4": application_data.get("step4"),
        "step5": application_data.get("step5"),
        "step6": application_data.get("step6"),
        "step7": application_data.get("step7"),
    }


def submit_form_b(db: Session, user: User, form_b_id: int) -> FormB:
    form_b = assert_can_submit(db, user, form_b_id)
    application_data = form_b.application_data or {}

    missing = [key for key in STEP_KEYS if key not in application_data]
    if missing:
        raise CRUDValidationError(
            f"Complete all Form B steps before submission (missing: {', '.join(missing)})"
        )

    if not form_b_has_lmcp_faculty(db, form_b):
        raise CRUDValidationError(
            "At least one LMCP faculty investigator is required before submission."
        )

    project = db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()
    if project:
        project.status = "submitted"

    form_b.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(form_b)
    return form_b
