from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from crud.exceptions import CRUDDatabaseError, CRUDNotFoundError, CRUDValidationError
from database.lmcpafm_models import (
    FormB,
    FormBAnimalRequirement,
    FormBMeetingDecision,
    IAECMeeting,
    IAECProject,
)
from schemas.formb_internal import FormBBase
from schemas.schemas_formb import FormBMeetingDecisionValue

APPROVED_CERTIFICATE_DECISIONS = frozenset(
    {
        FormBMeetingDecisionValue.approved.value,
        FormBMeetingDecisionValue.approved_with_revisions.value,
        FormBMeetingDecisionValue.animal_count_amended.value,
    }
)

PROTOCOL_PREFIX = "LMCP/IAEC"


def _assert_form_b_submitted_for_iaec(form_b: FormB) -> None:
    if form_b.submitted_at is None:
        raise CRUDValidationError(
            "Only fully submitted Form B applications can enter the IAEC decision cycle."
        )


def get_formb_by_protocol(db: Session, protocol_number: str) -> IAECProject | None:
    return (
        db.query(IAECProject)
        .filter(IAECProject.protocol_number == protocol_number)
        .first()
    )


def update_formb(db: Session, project_id: int, data: FormBBase) -> IAECProject | None:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if not project:
        return None

    project.protocol_number = data.protocol_number
    project.title = data.title
    project.principal_investigator = data.principal_investigator
    project.purpose = data.purpose
    project.approval_date = data.approval_date

    db.commit()
    db.refresh(project)
    return project


def _normalize_protocol_number(value: str | None) -> str | None:
    if value is None or not str(value).strip():
        return None
    return str(value).strip()


def get_form_b_by_id(db: Session, form_b_id: int) -> FormB:
    form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
    if not form_b:
        raise CRUDNotFoundError("Form B not found")
    return form_b


def _get_project_for_form_b(db: Session, form_b: FormB) -> IAECProject | None:
    return db.query(IAECProject).filter(IAECProject.id == form_b.project_id).first()


def form_b_to_record_read(db: Session, form_b: FormB) -> dict:
    project = _get_project_for_form_b(db, form_b)
    return {
        "id": form_b.id,
        "project_id": form_b.project_id,
        "date": form_b.date,
        "meeting_id": form_b.meeting_id,
        "protocol_number": _normalize_protocol_number(project.protocol_number if project else None),
    }


def form_b_to_protocol_read(db: Session, form_b: FormB) -> dict:
    record = form_b_to_record_read(db, form_b)
    protocol_number = record["protocol_number"]
    if not protocol_number:
        raise CRUDValidationError("Protocol number has not been generated yet")
    return {
        "id": record["id"],
        "project_id": record["project_id"],
        "date": record["date"],
        "meeting_id": record["meeting_id"],
        "protocol_number": protocol_number,
    }


def _animal_requirements_for_form_b(db: Session, form_b_id: int) -> list[dict]:
    rows = (
        db.query(FormBAnimalRequirement)
        .options(
            joinedload(FormBAnimalRequirement.species),
            joinedload(FormBAnimalRequirement.strain),
        )
        .filter(FormBAnimalRequirement.form_b_id == form_b_id)
        .order_by(FormBAnimalRequirement.id.asc())
        .all()
    )
    return [
        {
            "species_id": row.species_id,
            "species_name": row.species.name if row.species else "",
            "strain_id": row.strain_id,
            "strain_name": row.strain.name if row.strain else "",
            "count": row.count,
        }
        for row in rows
    ]


def list_form_b_with_meeting(db: Session) -> list[dict]:
    rows = (
        db.query(FormB, IAECProject, IAECMeeting, FormBMeetingDecision)
        .join(IAECProject, FormB.project_id == IAECProject.id)
        .outerjoin(IAECMeeting, FormB.meeting_id == IAECMeeting.id)
        .outerjoin(
            FormBMeetingDecision,
            (FormBMeetingDecision.form_b_id == FormB.id)
            & (FormBMeetingDecision.meeting_id == FormB.meeting_id),
        )
        .order_by(FormB.date.desc(), FormB.id.asc())
        .all()
    )
    return [
        {
            "form_b_id": form_b.id,
            "project_id": project.id,
            "project_title": project.title,
            "form_b_date": form_b.date,
            "meeting_id": form_b.meeting_id,
            "meeting_date": meeting.date if meeting else None,
            "meeting_number": meeting.meeting_number if meeting else None,
            "protocol_number": _normalize_protocol_number(project.protocol_number),
            "decision": decision.decision if decision else None,
            "approved_animal_count": decision.approved_animal_count if decision else None,
            "decision_remarks": decision.remarks if decision else None,
            "submitted_at": form_b.submitted_at,
            "is_submitted": form_b.submitted_at is not None,
        }
        for form_b, project, meeting, decision in rows
    ]


def _get_meeting_or_raise(db: Session, meeting_id: int) -> IAECMeeting:
    meeting = db.query(IAECMeeting).filter(IAECMeeting.id == meeting_id).first()
    if not meeting:
        raise CRUDNotFoundError("Meeting not found")
    return meeting


def get_meeting_form_b_summary(db: Session, meeting_id: int) -> list[dict]:
    meeting = _get_meeting_or_raise(db, meeting_id)
    rows = (
        db.query(FormB, IAECProject, FormBMeetingDecision)
        .join(IAECProject, FormB.project_id == IAECProject.id)
        .outerjoin(
            FormBMeetingDecision,
            (FormBMeetingDecision.form_b_id == FormB.id)
            & (FormBMeetingDecision.meeting_id == FormB.meeting_id),
        )
        .filter(FormB.meeting_id == meeting_id)
        .order_by(FormB.date.asc(), FormB.id.asc())
        .all()
    )
    return [
        {
            "form_b_id": form_b.id,
            "project_id": project.id,
            "project_title": project.title,
            "investigator_name": project.investigator_name,
            "meeting_id": meeting.id,
            "meeting_date": meeting.date,
            "meeting_number": meeting.meeting_number,
            "protocol_number": _normalize_protocol_number(project.protocol_number),
            "decision": decision.decision if decision else None,
            "approved_animal_count": decision.approved_animal_count if decision else None,
            "decision_remarks": decision.remarks if decision else None,
            "animal_requirements": _animal_requirements_for_form_b(db, form_b.id),
        }
        for form_b, project, decision in rows
    ]


def get_meeting_certificate_data(db: Session, meeting_id: int) -> list[dict]:
    rows = get_meeting_form_b_summary(db, meeting_id)
    return [row for row in rows if row["decision"] in APPROVED_CERTIFICATE_DECISIONS]


def assign_form_b_meeting(
    db: Session,
    form_b_id: int,
    meeting_id: int | None,
) -> dict:
    form_b = get_form_b_by_id(db, form_b_id)
    if meeting_id is not None:
        _assert_form_b_submitted_for_iaec(form_b)

    if meeting_id is not None:
        _get_meeting_or_raise(db, meeting_id)

    try:
        form_b.meeting_id = meeting_id
        db.commit()
        db.refresh(form_b)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc

    return form_b_to_record_read(db, form_b)


def _count_protocols_for_meeting(db: Session, meeting_id: int) -> int:
    return (
        db.query(func.count(FormB.id))
        .join(IAECProject, FormB.project_id == IAECProject.id)
        .filter(
            FormB.meeting_id == meeting_id,
            IAECProject.protocol_number.isnot(None),
            IAECProject.protocol_number != "",
        )
        .scalar()
        or 0
    )


def _get_decision_for_form_b_meeting(
    db: Session,
    form_b_id: int,
    meeting_id: int,
) -> FormBMeetingDecision | None:
    return (
        db.query(FormBMeetingDecision)
        .filter(
            FormBMeetingDecision.form_b_id == form_b_id,
            FormBMeetingDecision.meeting_id == meeting_id,
        )
        .first()
    )


def _assign_protocol_number(
    db: Session,
    form_b: FormB,
    *,
    require_approved_decision: bool,
    finalize_approval: bool,
) -> str:
    project = _get_project_for_form_b(db, form_b)
    if project is None:
        raise CRUDNotFoundError("Linked IAEC project not found")

    existing = _normalize_protocol_number(project.protocol_number)
    if existing:
        return existing

    if form_b.meeting_id is None:
        raise CRUDValidationError(
            "Form B must be assigned to an IAEC meeting before generating a protocol number"
        )

    meeting = _get_meeting_or_raise(db, form_b.meeting_id)
    if not meeting.meeting_number or not str(meeting.meeting_number).strip():
        raise CRUDValidationError(
            "IAEC meeting must have a meeting number before generating protocol numbers"
        )

    if require_approved_decision:
        decision = _get_decision_for_form_b_meeting(db, form_b.id, meeting.id)
        if decision is None or decision.decision not in APPROVED_CERTIFICATE_DECISIONS:
            raise CRUDValidationError(
                "Protocol number can only be generated after an approved IAEC meeting decision"
            )

    year = meeting.date.year
    serial = _count_protocols_for_meeting(db, meeting.id) + 1
    protocol_number = f"{PROTOCOL_PREFIX}/{year}/{meeting.meeting_number.strip()}/{serial:03d}"

    try:
        project.protocol_number = protocol_number
        if finalize_approval:
            project.approval_date = meeting.date
            project.status = "approved"
            from crud.formb_study_plan import sync_experiment_groups_from_study_plan

            sync_experiment_groups_from_study_plan(db, project.id)
        db.commit()
        db.refresh(form_b)
        db.refresh(project)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc

    return protocol_number


def ensure_form_b_protocol_number_for_invitation(db: Session, form_b_id: int) -> str:
    form_b = get_form_b_by_id(db, form_b_id)
    _assert_form_b_submitted_for_iaec(form_b)
    return _assign_protocol_number(
        db,
        form_b,
        require_approved_decision=False,
        finalize_approval=False,
    )


def finalize_form_b_protocol_approval(db: Session, form_b_id: int) -> tuple[FormB, str]:
    form_b = get_form_b_by_id(db, form_b_id)
    _assert_form_b_submitted_for_iaec(form_b)
    project = _get_project_for_form_b(db, form_b)
    if project is None:
        raise CRUDNotFoundError("Linked IAEC project not found")

    protocol_number = _normalize_protocol_number(project.protocol_number)
    if not protocol_number:
        raise CRUDValidationError("Generate or send a meeting invitation to assign a protocol number first")

    if form_b.meeting_id is None:
        raise CRUDValidationError("Form B must be assigned to an IAEC meeting")

    meeting = _get_meeting_or_raise(db, form_b.meeting_id)
    decision = _get_decision_for_form_b_meeting(db, form_b.id, meeting.id)
    if decision is None or decision.decision not in APPROVED_CERTIFICATE_DECISIONS:
        raise CRUDValidationError(
            "Protocol approval can only be finalized after an approved IAEC meeting decision"
        )

    if (project.status or "").strip().lower() == "approved":
        return form_b, protocol_number

    try:
        project.approval_date = meeting.date
        project.status = "approved"
        from crud.formb_study_plan import sync_experiment_groups_from_study_plan

        sync_experiment_groups_from_study_plan(db, project.id)
        db.commit()
        db.refresh(form_b)
        db.refresh(project)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc

    return form_b, protocol_number


def generate_form_b_protocol_number(db: Session, form_b_id: int) -> tuple[FormB, str]:
    form_b = get_form_b_by_id(db, form_b_id)
    _assert_form_b_submitted_for_iaec(form_b)
    project = _get_project_for_form_b(db, form_b)
    if project is None:
        raise CRUDNotFoundError("Linked IAEC project not found")

    existing = _normalize_protocol_number(project.protocol_number)
    if existing:
        if (project.status or "").strip().lower() != "approved":
            return finalize_form_b_protocol_approval(db, form_b_id)
        raise CRUDValidationError("Protocol number already exists for this project")

    protocol_number = _assign_protocol_number(
        db,
        form_b,
        require_approved_decision=True,
        finalize_approval=True,
    )
    db.refresh(form_b)
    return form_b, protocol_number


def upsert_form_b_meeting_decision(
    db: Session,
    form_b_id: int,
    meeting_id: int,
    decision: str,
    approved_animal_count: int | None = None,
    remarks: str | None = None,
) -> FormBMeetingDecision:
    form_b = get_form_b_by_id(db, form_b_id)
    _assert_form_b_submitted_for_iaec(form_b)
    _get_meeting_or_raise(db, meeting_id)

    if form_b.meeting_id != meeting_id:
        raise CRUDValidationError("Decision meeting must match the Form B's assigned meeting")

    if decision == FormBMeetingDecisionValue.animal_count_amended.value and approved_animal_count is None:
        raise CRUDValidationError("Approved animal count is required for animal_count_amended decisions")

    existing = _get_decision_for_form_b_meeting(db, form_b_id, meeting_id)
    try:
        if existing:
            existing.decision = decision
            existing.approved_animal_count = approved_animal_count
            existing.remarks = remarks
            db.commit()
            db.refresh(existing)
            return existing

        record = FormBMeetingDecision(
            form_b_id=form_b_id,
            meeting_id=meeting_id,
            decision=decision,
            approved_animal_count=approved_animal_count,
            remarks=remarks,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc
