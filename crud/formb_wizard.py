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
from crud.formb_attachments import has_form_b_attachment, save_system_form_b_attachment
from crud.formb_documents import render_study_plan_annexure_pdf
from crud.formb_study_plan import STEP2B_KEY, validate_study_plan_exists
from models.user import User
from utils.institution import get_institutional_form_b_defaults

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
    institutional = get_institutional_form_b_defaults()
    return {
        **institutional,
        "establishment_name": profile.institution_name or institutional["establishment_name"],
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


def _normalize_step3_requirements(payload: dict) -> list[dict]:
    requirements = payload.get("requirements")
    if isinstance(requirements, list) and requirements:
        return requirements
    if payload.get("species"):
        return [payload]
    return []


def _sync_animal_requirements(db: Session, form_b: FormB, payload: dict) -> None:
    requirements = _normalize_step3_requirements(payload)

    for existing in list(form_b.animal_requirements):
        db.delete(existing)
    db.flush()

    for requirement in requirements:
        species = (
            db.query(Species)
            .filter(Species.name.ilike(requirement["species"].strip()))
            .first()
        )
        strain = (
            db.query(Strain)
            .filter(Strain.name.ilike(requirement["strain"].strip()))
            .first()
            if species
            else None
        )
        if strain and strain.species_id != species.id:
            strain = None

        if not species or not strain:
            continue

        db.add(
            FormBAnimalRequirement(
                form_b_id=form_b.id,
                species_id=species.id,
                strain_id=strain.id,
                count=int(requirement["number_required"]),
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
        project_role="principal_investigator",
        user_id=user.id,
        investigator_profile_user_id=user.id,
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

    institutional = get_institutional_form_b_defaults()
    step_payload = {
        **institutional,
        "principal_investigator": payload["principal_investigator"],
        "designation": payload["designation"],
        "department": payload["department"],
        "contact_email": payload["contact_email"],
        "contact_phone": payload["contact_phone"],
        "qualifications": payload["qualifications"],
        "experience": payload.get("experience") or "",
        "research_type": payload["research_type"],
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

    if step_key == "step3":
        data = {"requirements": _normalize_step3_requirements(data)}
        if not data["requirements"]:
            raise CRUDValidationError("Add at least one animal requirement.")

    _set_step_data(form_b, step_key, data)

    if step_key == "step2":
        project = db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()
        if project:
            project.title = data["title"]
            project.objective = data["objectives"]
            project.purpose = data["summary"]

    if step_key == "step3":
        _sync_animal_requirements(db, form_b, data)

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
        "step2b": application_data.get(STEP2B_KEY),
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

    if not has_form_b_attachment(db, form_b.id, "funding_proof"):
        raise CRUDValidationError("Upload funding proof before submitting Form B.")

    validate_study_plan_exists(db, form_b.id)
    annexure_pdf = render_study_plan_annexure_pdf(db, form_b.id)
    save_system_form_b_attachment(
        db,
        form_b.id,
        "study_plan_annexure",
        "annexure-i-study-plan.pdf",
        annexure_pdf,
        uploaded_by_user_id=user.id,
    )

    step7 = application_data.get("step7") or {}
    if step7.get("hazardous_agents_used") == "Yes":
        certificate_categories = (
            "aerb_certificate",
            "ibsc_certificate",
            "rcgm_certificate",
            "other_hazardous_certificate",
        )
        reference_fields = (
            "aerb_approval_reference",
            "ibsc_approval_reference",
            "rcgm_approval_reference",
            "other_hazardous_reference",
        )
        for category, reference_field in zip(certificate_categories, reference_fields, strict=True):
            if step7.get(reference_field) and not has_form_b_attachment(db, form_b.id, category):
                raise CRUDValidationError(
                    f"Upload the certificate file for {reference_field.replace('_', ' ')}."
                )

    project = db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()
    if project:
        project.status = "submitted"

    form_b.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(form_b)
    return form_b
