from datetime import datetime, timezone
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from database.lmcpafm_experiments import Experiment, ExperimentAnimal
from database.lmcpafm_models import IAECProject, Animal, ExperimentGroup
from database.lmcpafm_requisition_allocation import AnimalAllocation
from schemas.schemas_experiments import ExperimentCreate
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from utils.business_validation import assert_experiment_date_valid


def create_experiment(db: Session, exp: ExperimentCreate):

    # -------------------------------------------------------
    # 1. Validate protocol
    # -------------------------------------------------------
    protocol = db.query(IAECProject).filter(IAECProject.id == exp.protocol_id).first()
    if not protocol:
        raise CRUDNotFoundError("Protocol not found.")

    if not protocol.protocol_number:
        raise CRUDValidationError(f"Protocol {protocol.id} has no IAEC-approved protocol number.")

    if not protocol.approval_date:
        raise CRUDValidationError(
            f"Protocol {protocol.protocol_number} is not approved by IAEC."
        )

    if hasattr(protocol, "status") and protocol.status.lower() != "approved":
        raise CRUDValidationError(
            f"Protocol {protocol.protocol_number} is not approved. "
            f"Current status: {protocol.status}"
        )

    # -------------------------------------------------------
    # 2. Validate allocation
    # -------------------------------------------------------
    allocation = (
        db.query(AnimalAllocation)
        .filter(AnimalAllocation.id == exp.allocation_id)
        .first()
    )
    if not allocation:
        raise CRUDNotFoundError("Allocation not found.")

    requisition = allocation.requisition
    if requisition is None or requisition.protocol_id != exp.protocol_id:
        raise CRUDValidationError(
            "Allocation does not belong to the selected protocol."
        )

    group = (
        db.query(ExperimentGroup)
        .filter(ExperimentGroup.id == exp.experiment_group_id)
        .first()
    )
    if not group:
        raise CRUDNotFoundError("Experiment group not found.")
    if group.project_id != exp.protocol_id:
        raise CRUDValidationError(
            "Experiment group does not belong to the selected protocol."
        )

    animal_count = len(exp.animals)
    if animal_count > (group.planned_animal_count or 0):
        raise CRUDValidationError(
            f"Experiment uses {animal_count} animals but group "
            f"'{group.name}' is planned for {group.planned_animal_count}."
        )

    assert_experiment_date_valid(
        db,
        project_id=exp.protocol_id,
        allocation_date=allocation.date,
        experiment_date=exp.date,
    )

    # -------------------------------------------------------
    # 3. Create experiment header
    # -------------------------------------------------------
    db_exp = Experiment(
        protocol_id=exp.protocol_id,
        allocation_id=exp.allocation_id,
        experiment_group_id=exp.experiment_group_id,

        date=exp.date,
        performed_by=exp.performed_by,
        purpose=exp.purpose,

        procedure=exp.procedure,
        dose=exp.dose,
        observations=exp.observations,

        start_time=exp.start_time or datetime.now(timezone.utc),
        end_time=exp.end_time,
    )

    db.add(db_exp)
    try:
        db.commit()
        db.refresh(db_exp)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc))

    # -------------------------------------------------------
    # 4. Link animals to experiment
    # -------------------------------------------------------
    for item in exp.animals:
        animal = db.query(Animal).filter(Animal.id == item.animal_id).first()

        if not animal:
            raise CRUDNotFoundError(f"Animal ID {item.animal_id} does not exist.")

        if animal.status not in ["allocated", "in_experiment"]:
            raise CRUDValidationError(
                f"Animal {animal.id} is not allocated or already disposed."
            )

        animal.status = "in_experiment"
        db.add(animal)

        link = ExperimentAnimal(
            experiment_id=db_exp.id,
            animal_id=item.animal_id
        )
        db.add(link)

    try:
        db.commit()
        db.refresh(db_exp)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc))

    return db_exp


def get_experiment(db: Session, exp_id: int):
    return (
        db.query(Experiment)
        .filter(Experiment.id == exp_id)
        .first()
    )


def list_experiments_by_allocation(db: Session, allocation_id: int) -> list[Experiment]:
    return (
        db.query(Experiment)
        .filter(Experiment.allocation_id == allocation_id)
        .order_by(Experiment.date.desc(), Experiment.id.asc())
        .all()
    )


def list_experiments_by_protocol(db: Session, protocol_id: int) -> list[Experiment]:
    return (
        db.query(Experiment)
        .filter(Experiment.protocol_id == protocol_id)
        .options(selectinload(Experiment.animals))
        .order_by(Experiment.date.desc(), Experiment.id.asc())
        .all()
    )
