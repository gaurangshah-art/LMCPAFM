from __future__ import annotations

from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from database.lmcpafm_models import Animal, ExperimentGroup, IAECProject

ASSIGNABLE_STATUSES = frozenset({"allocated", "in_experiment"})


def _get_group(db: Session, group_id: int) -> ExperimentGroup:
    group = db.query(ExperimentGroup).filter(ExperimentGroup.id == group_id).first()
    if group is None:
        raise CRUDNotFoundError("Experiment group not found.")
    return group


def count_assigned_animals(db: Session, group_id: int) -> int:
    return (
        db.query(Animal)
        .filter(Animal.experiment_group_id == group_id)
        .count()
    )


def validate_group_assignment_capacity(
    db: Session,
    group: ExperimentGroup,
    additional_count: int,
) -> None:
    assigned = count_assigned_animals(db, group.id)
    planned = group.planned_animal_count or 0
    if assigned + additional_count > planned:
        raise CRUDValidationError(
            f"Group '{group.name}' is planned for {planned} animals; "
            f"{assigned} already assigned and {additional_count} more requested."
        )


def assign_animals_to_group(
    db: Session,
    group_id: int,
    animal_ids: list[int],
) -> dict:
    if not animal_ids:
        raise CRUDValidationError("Provide at least one animal id to assign.")

    group = _get_group(db, group_id)
    unique_ids = sorted(set(animal_ids))
    validate_group_assignment_capacity(db, group, len(unique_ids))

    animals = db.query(Animal).filter(Animal.id.in_(unique_ids)).all()
    if len(animals) != len(unique_ids):
        found = {animal.id for animal in animals}
        missing = [animal_id for animal_id in unique_ids if animal_id not in found]
        raise CRUDNotFoundError(f"Animal(s) not found: {', '.join(str(i) for i in missing)}")

    for animal in animals:
        if animal.protocol_id != group.project_id:
            raise CRUDValidationError(
                f"Animal {animal.animal_number or animal.id} is not allocated to this project."
            )
        if animal.status not in ASSIGNABLE_STATUSES:
            raise CRUDValidationError(
                f"Animal {animal.animal_number or animal.id} must be allocated before group assignment."
            )
        animal.experiment_group_id = group.id

    db.commit()
    return get_group_assignment_summary(db, group_id)


def get_group_assignment_summaries(db: Session, project_id: int) -> list[dict]:
    groups = (
        db.query(ExperimentGroup)
        .filter(ExperimentGroup.project_id == project_id)
        .order_by(ExperimentGroup.name.asc(), ExperimentGroup.id.asc())
        .all()
    )
    return [get_group_assignment_summary(db, group.id) for group in groups]


def get_group_assignment_summary(db: Session, group_id: int) -> dict:
    group = _get_group(db, group_id)
    animals = (
        db.query(Animal)
        .filter(Animal.experiment_group_id == group_id)
        .order_by(Animal.animal_number.asc(), Animal.id.asc())
        .all()
    )
    cage_ids = sorted({animal.cage_id for animal in animals if animal.cage_id is not None})
    return {
        "group_id": group.id,
        "group_name": group.name,
        "project_id": group.project_id,
        "planned_animal_count": group.planned_animal_count,
        "assigned_count": len(animals),
        "cage_count": len(cage_ids),
        "animals": [
            {
                "id": animal.id,
                "animal_number": animal.animal_number,
                "status": animal.status,
                "cage_id": animal.cage_id,
            }
            for animal in animals
        ],
    }


def list_unassigned_project_animals(db: Session, project_id: int) -> list[dict]:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError(f"IAEC project {project_id} not found.")

    animals = (
        db.query(Animal)
        .filter(
            Animal.protocol_id == project_id,
            Animal.experiment_group_id.is_(None),
            Animal.status.in_(tuple(ASSIGNABLE_STATUSES)),
        )
        .order_by(Animal.animal_number.asc(), Animal.id.asc())
        .all()
    )
    return [
        {
            "id": animal.id,
            "animal_number": animal.animal_number,
            "status": animal.status,
            "cage_id": animal.cage_id,
        }
        for animal in animals
    ]
