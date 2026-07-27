from __future__ import annotations

from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from database.lmcpafm_models import (
    ExperimentGroup,
    FormB,
    FormBAnimalRequirement,
    FormBMeetingDecision,
    IAECProject,
)


def _normalize_status(status: str | None) -> str:
    return (status or "").strip().lower()


def get_project_animal_cap(db: Session, project_id: int) -> int | None:
    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    if form_b is None:
        return None

    if form_b.meeting_id is not None:
        decision = (
            db.query(FormBMeetingDecision)
            .filter(
                FormBMeetingDecision.form_b_id == form_b.id,
                FormBMeetingDecision.meeting_id == form_b.meeting_id,
            )
            .first()
        )
        if decision is not None and decision.approved_animal_count is not None:
            return decision.approved_animal_count

    requirements = (
        db.query(FormBAnimalRequirement)
        .filter(FormBAnimalRequirement.form_b_id == form_b.id)
        .all()
    )
    if requirements:
        return sum(requirement.count for requirement in requirements)

    return None


def get_project_planned_total(db: Session, project_id: int, exclude_group_id: int | None = None) -> int:
    query = db.query(ExperimentGroup).filter(ExperimentGroup.project_id == project_id)
    if exclude_group_id is not None:
        query = query.filter(ExperimentGroup.id != exclude_group_id)
    groups = query.all()
    return sum(group.planned_animal_count or 0 for group in groups)


def assert_project_approved_for_planning(db: Session, project_id: int) -> IAECProject:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError(f"IAEC project {project_id} not found.")
    if _normalize_status(project.status) != "approved":
        raise CRUDValidationError(
            "Experiment groups can only be planned after IAEC approval of the project."
        )
    return project


def validate_group_planned_count(
    db: Session,
    project_id: int,
    planned_animal_count: int,
    exclude_group_id: int | None = None,
) -> None:
    if planned_animal_count <= 0:
        raise CRUDValidationError("Planned animal count must be greater than zero.")

    cap = get_project_animal_cap(db, project_id)
    if cap is None:
        raise CRUDValidationError(
            "No approved animal count is recorded for this project. "
            "Complete IAEC approval or Form B animal requirements first."
        )

    existing_total = get_project_planned_total(db, project_id, exclude_group_id=exclude_group_id)
    proposed_total = existing_total + planned_animal_count
    if proposed_total > cap:
        raise CRUDValidationError(
            f"Planned animals ({proposed_total}) would exceed the approved limit ({cap})."
        )


def experiment_groups_complete(db: Session, project_id: int) -> bool:
    try:
        assert_experiment_groups_complete(db, project_id)
        return True
    except CRUDValidationError:
        return False


def assert_experiment_groups_complete(db: Session, project_id: int) -> None:
    assert_project_approved_for_planning(db, project_id)

    groups = (
        db.query(ExperimentGroup)
        .filter(ExperimentGroup.project_id == project_id)
        .order_by(ExperimentGroup.id.asc())
        .all()
    )
    if not groups:
        raise CRUDValidationError(
            "Define at least one experiment group with planned animal counts before creating a requisition."
        )

    invalid_groups = [group for group in groups if (group.planned_animal_count or 0) <= 0]
    if invalid_groups:
        raise CRUDValidationError(
            "Every experiment group must have a planned animal count greater than zero."
        )

    cap = get_project_animal_cap(db, project_id)
    planned_total = sum(group.planned_animal_count for group in groups)
    if cap is None:
        raise CRUDValidationError(
            "No approved animal count is recorded for this project."
        )
    if planned_total > cap:
        raise CRUDValidationError(
            f"Planned animals ({planned_total}) exceed the approved limit ({cap})."
        )


def get_experiment_planning_status(db: Session, project_id: int) -> dict:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError(f"IAEC project {project_id} not found.")

    groups = (
        db.query(ExperimentGroup)
        .filter(ExperimentGroup.project_id == project_id)
        .order_by(ExperimentGroup.id.asc())
        .all()
    )
    cap = get_project_animal_cap(db, project_id)
    planned_total = sum(group.planned_animal_count or 0 for group in groups)
    is_complete = False
    message: str | None = None

    if _normalize_status(project.status) != "approved":
        message = "Project is not IAEC-approved yet."
    elif not groups:
        message = "Add at least one experiment group with planned animal counts."
    elif any((group.planned_animal_count or 0) <= 0 for group in groups):
        message = "Each experiment group needs a planned animal count greater than zero."
    elif cap is None:
        message = "Approved animal count is not available for this project."
    elif planned_total > cap:
        message = f"Planned animals ({planned_total}) exceed the approved limit ({cap})."
    else:
        is_complete = True
        message = "Experiment group planning is complete. You may create a requisition."

    return {
        "project_id": project_id,
        "project_status": project.status,
        "approved_animal_count": cap,
        "planned_animal_total": planned_total,
        "remaining_animals": (cap - planned_total) if cap is not None else None,
        "group_count": len(groups),
        "is_complete": is_complete,
        "can_create_requisition": is_complete,
        "message": message,
    }


def assert_requisition_allowed(
    db: Session,
    protocol_id: int,
    requested_total: int,
) -> None:
    assert_experiment_groups_complete(db, protocol_id)

    planned_total = get_project_planned_total(db, protocol_id)
    if requested_total > planned_total:
        raise CRUDValidationError(
            f"Requested animals ({requested_total}) exceed the planned total ({planned_total}) "
            "across experiment groups."
        )
