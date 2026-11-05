from __future__ import annotations

from sqlalchemy.orm import Session

from crud.experiment_group_planning import get_experiment_planning_status
from database.lmcpafm_experiments import Experiment, ExperimentAnimal
from database.lmcpafm_models import Animal, ExperimentGroup, FormB, FormBMeetingDecision, IAECMeeting, IAECProject
from database.lmcpafm_requisition_allocation import (
    AnimalAllocation,
    AnimalAllocationItem,
    AnimalRequisition,
)
from utils.institution import (
    get_cpcsea_registration_date,
    get_cpcsea_registration_number,
    get_establishment_name,
)

PROVISIONAL_DISCLAIMER = (
    "EXPERIMENTAL WORK IS NOT COMPLETED / NOT INITIATED. "
    "This document is issued solely as proof of IAEC approval of the project proposal. "
    "It is NOT valid for journal publication and must NOT be used as proof of completed "
    "animal experimentation."
)

FINAL_ATTESTATION = (
    "This is to certify that the animal experimentation under the above IAEC protocol "
    "has been conducted in accordance with CPCSEA guidelines. Experiment groups were "
    "defined, animal usage was allocated through the institutional system, and "
    "experiment records were maintained as required."
)

SIGNED_HARD_COPY_NOTE = (
    "The official IAEC certificate for journal submission is the signed hard copy "
    "bearing signatures of the IAEC Chairperson, CPCSEA nominee, and Member Secretary. "
    "Once experimentation records are complete in LMCPAFM, IAEC will upload the scanned "
    "signed certificate here."
)

PUBLICATION_READY_NOTE = (
    "The scanned signed hard-copy certificate uploaded by IAEC is available below. "
    "Use this document for journal submission."
)


def _normalize_status(status: str | None) -> str:
    return (status or "").strip().lower()


def _allocated_animal_count(db: Session, project_id: int) -> int:
    return (
        db.query(AnimalAllocationItem)
        .join(AnimalAllocation, AnimalAllocationItem.allocation_id == AnimalAllocation.id)
        .join(AnimalRequisition, AnimalAllocation.requisition_id == AnimalRequisition.id)
        .filter(AnimalRequisition.protocol_id == project_id)
        .with_entities(AnimalAllocationItem.allocated_count)
        .all()
    )


def _logged_animal_count(db: Session, project_id: int) -> int:
    return (
        db.query(ExperimentAnimal)
        .join(Experiment, ExperimentAnimal.experiment_id == Experiment.id)
        .filter(Experiment.protocol_id == project_id)
        .count()
    )


def _pending_allocated_animals(db: Session, project_id: int) -> int:
    return (
        db.query(Animal)
        .filter(
            Animal.protocol_id == project_id,
            Animal.status == "allocated",
        )
        .count()
    )


def _group_logging_status(db: Session, project_id: int) -> list[dict]:
    groups = (
        db.query(ExperimentGroup)
        .filter(ExperimentGroup.project_id == project_id)
        .order_by(ExperimentGroup.id.asc())
        .all()
    )
    rows: list[dict] = []
    for group in groups:
        logged = (
            db.query(ExperimentAnimal)
            .join(Experiment, ExperimentAnimal.experiment_id == Experiment.id)
            .filter(Experiment.experiment_group_id == group.id)
            .count()
        )
        planned = group.planned_animal_count or 0
        rows.append(
            {
                "group_id": group.id,
                "group_name": group.name,
                "planned_animal_count": planned,
                "logged_animal_count": logged,
                "is_complete": planned > 0 and logged >= planned,
            }
        )
    return rows


def get_project_certificate_status(db: Session, project_id: int) -> dict:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        return {"project_id": project_id, "exists": False}

    planning = get_experiment_planning_status(db, project_id)
    allocated_items = _allocated_animal_count(db, project_id)
    allocated_total = sum(count for (count,) in allocated_items)
    logged_total = _logged_animal_count(db, project_id)
    pending_allocated = _pending_allocated_animals(db, project_id)
    group_rows = _group_logging_status(db, project_id)

    groups_logged = bool(group_rows) and all(row["is_complete"] for row in group_rows)
    work_initiated = allocated_total > 0
    all_allocated_logged = work_initiated and logged_total >= allocated_total and pending_allocated == 0
    approved = _normalize_status(project.status) == "approved"

    blocking_reasons: list[str] = []
    if not approved:
        blocking_reasons.append("Project is not IAEC-approved.")
    if not planning["is_complete"]:
        blocking_reasons.append("Experiment groups are not fully planned.")
    if not work_initiated:
        blocking_reasons.append("Animal allocation has not started.")
    if work_initiated and not all_allocated_logged:
        blocking_reasons.append("Not all allocated animals have experiment logs.")
    if group_rows and not groups_logged:
        blocking_reasons.append("Not all experiment groups have required logged animals.")

    is_final = approved and planning["is_complete"] and groups_logged and all_allocated_logged

    if not work_initiated:
        work_state = "not_initiated"
    elif is_final:
        work_state = "completed"
    else:
        work_state = "in_progress"

    last_experiment = (
        db.query(Experiment)
        .filter(Experiment.protocol_id == project_id)
        .order_by(Experiment.date.desc(), Experiment.id.desc())
        .first()
    )

    return {
        "project_id": project_id,
        "exists": True,
        "certificate_type": "final" if is_final else "provisional",
        "is_final": is_final,
        "work_state": work_state,
        "approved": approved,
        "planning_complete": planning["is_complete"],
        "work_initiated": work_initiated,
        "groups_logged": groups_logged,
        "all_allocated_logged": all_allocated_logged,
        "allocated_animal_count": allocated_total,
        "logged_animal_count": logged_total,
        "pending_allocated_animals": pending_allocated,
        "planned_animal_total": planning["planned_animal_total"],
        "groups": group_rows,
        "blocking_reasons": blocking_reasons,
        "completion_date": last_experiment.date.isoformat() if is_final and last_experiment else None,
        "disclaimer": None if is_final else PROVISIONAL_DISCLAIMER,
    }


def build_project_certificate_data(db: Session, project_id: int) -> dict:
    from crud.exceptions import CRUDNotFoundError

    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError("Project not found")

    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    meeting = None
    decision = None
    if form_b and form_b.meeting_id:
        meeting = db.query(IAECMeeting).filter(IAECMeeting.id == form_b.meeting_id).first()
        decision = (
            db.query(FormBMeetingDecision)
            .filter(
                FormBMeetingDecision.form_b_id == form_b.id,
                FormBMeetingDecision.meeting_id == form_b.meeting_id,
            )
            .first()
        )

    step1 = (form_b.application_data or {}).get("step1", {}) if form_b else {}
    status = get_project_certificate_status(db, project_id)
    is_final = status["is_final"]

    from crud.project_signed_certificate import get_signed_certificate_read

    signed_certificate = get_signed_certificate_read(db, project_id)
    publication_ready = is_final and signed_certificate is not None

    if publication_ready:
        publication_note = PUBLICATION_READY_NOTE
    elif is_final:
        publication_note = SIGNED_HARD_COPY_NOTE
    else:
        publication_note = None

    return {
        "certificate_type": "final" if is_final else "provisional",
        "is_final": is_final,
        "publication_ready": publication_ready,
        "signed_certificate": signed_certificate,
        "publication_note": publication_note,
        "work_state": status["work_state"],
        "disclaimer": status["disclaimer"],
        "final_attestation": FINAL_ATTESTATION if is_final else None,
        "completion_date": status["completion_date"],
        "lmcp_iaec_id": project.protocol_number or "",
        "title": project.title,
        "investigator": project.principal_investigator or project.investigator_name,
        "department": step1.get("department") or "",
        "establishment_name": get_establishment_name(),
        "cpcsea_registration_number": get_cpcsea_registration_number(),
        "cpcsea_registration_date": get_cpcsea_registration_date(),
        "meeting_year": meeting.date.year if meeting and meeting.date else None,
        "meeting_number": meeting.meeting_number if meeting else None,
        "meeting_date": meeting.date.isoformat() if meeting and meeting.date else None,
        "approval_date": project.approval_date.isoformat() if project.approval_date else None,
        "approved_animal_count": decision.approved_animal_count if decision else None,
        "comments": decision.remarks if decision and decision.remarks else "",
        "chairperson_name": "IAEC Chairperson",
        "decision": decision.decision if decision else None,
        "usage_summary": {
            "planned_animals": status["planned_animal_total"],
            "allocated_animals": status["allocated_animal_count"],
            "logged_animals": status["logged_animal_count"],
            "pending_allocated_animals": status["pending_allocated_animals"],
        },
        "completion_status": {
            "planning_complete": status["planning_complete"],
            "work_initiated": status["work_initiated"],
            "groups_logged": status["groups_logged"],
            "all_allocated_logged": status["all_allocated_logged"],
            "blocking_reasons": status["blocking_reasons"],
            "groups": status["groups"],
        },
    }
