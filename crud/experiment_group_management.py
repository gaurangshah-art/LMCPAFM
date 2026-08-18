from __future__ import annotations

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from crud.exceptions import CRUDDatabaseError, CRUDNotFoundError, CRUDValidationError
from crud.experiment_group_assignment import count_assigned_animals
from crud.experiment_group_planning import validate_group_planned_count
from database.lmcpafm_experiments import Experiment
from database.lmcpafm_models import AnimalExperiment, ExperimentGroup


def _get_group(db: Session, group_id: int) -> ExperimentGroup:
    group = db.query(ExperimentGroup).filter(ExperimentGroup.id == group_id).first()
    if group is None:
        raise CRUDNotFoundError("Experiment group not found.")
    return group


def group_has_blocking_dependencies(db: Session, group_id: int) -> tuple[bool, str | None]:
    assigned = count_assigned_animals(db, group_id)
    if assigned > 0:
        return True, f"{assigned} animal(s) are assigned to this group."

    log_count = (
        db.query(Experiment)
        .filter(Experiment.experiment_group_id == group_id)
        .count()
    )
    if log_count > 0:
        return True, f"{log_count} experiment log(s) reference this group."

    description_count = (
        db.query(AnimalExperiment)
        .filter(AnimalExperiment.group_id == group_id)
        .count()
    )
    if description_count > 0:
        return True, f"{description_count} IAEC experiment description(s) reference this group."

    return False, None


def update_experiment_group(
    db: Session,
    group_id: int,
    *,
    name: str | None = None,
    planned_animal_count: int | None = None,
) -> ExperimentGroup:
    group = _get_group(db, group_id)

    if name is not None:
        cleaned = name.strip()
        if not cleaned:
            raise CRUDValidationError("Group name is required.")
        group.name = cleaned

    if planned_animal_count is not None:
        validate_group_planned_count(
            db,
            group.project_id,
            planned_animal_count,
            exclude_group_id=group.id,
        )
        group.planned_animal_count = planned_animal_count

    try:
        db.commit()
        db.refresh(group)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc

    return group


def delete_experiment_group(db: Session, group_id: int) -> None:
    group = _get_group(db, group_id)
    blocked, reason = group_has_blocking_dependencies(db, group_id)
    if blocked:
        raise CRUDValidationError(
            f"Cannot delete experiment group '{group.name}': {reason}"
        )

    try:
        db.delete(group)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc
