from datetime import date

from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.investigator_profile import get_or_create_profile, is_profile_complete
from database.lmcpafm_models import FormB, FormBInvestigator, IAECProject
from models.user import User


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

    form_b = FormB(project_id=project.id, date=date.today())
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


def save_form_b_step1(
    db: Session,
    user: User,
    form_b_id: int,
    payload: dict,
) -> FormB:
    form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
    if form_b is None:
        raise CRUDValidationError("Form B not found")

    membership = (
        db.query(FormBInvestigator)
        .filter(
            FormBInvestigator.form_b_id == form_b_id,
            FormBInvestigator.user_id == user.id,
        )
        .first()
    )
    if membership is None:
        raise CRUDValidationError("You are not allowed to edit this Form B")

    project = db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()
    if project is None:
        raise CRUDValidationError("Linked project not found")

    project.investigator_name = payload["principal_investigator"]
    project.principal_investigator = payload["principal_investigator"]
    project.purpose = payload.get("experience")

    membership.name = payload["principal_investigator"]
    db.commit()
    db.refresh(form_b)
    return form_b
