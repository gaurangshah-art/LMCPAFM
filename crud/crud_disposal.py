from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database.lmcpafm_disposal import Disposal
from database.lmcpafm_models import Animal
from database.lmcpafm_experiments import Experiment
from schemas.schemas_disposal import DisposalCreate
from crud.exceptions import CRUDValidationError, CRUDNotFoundError, CRUDDatabaseError


def create_disposal(db: Session, disp: DisposalCreate):

    # 1. Validate animal
    animal = db.query(Animal).filter(Animal.id == disp.animal_id).first()
    if not animal:
        raise CRUDNotFoundError(f"Animal {disp.animal_id} not found.")

    if animal.status in ["sacrificed", "dead", "euthanized"]:
        raise CRUDValidationError(f"Animal {animal.id} is already disposed.")

    # 2. Validate experiment (optional)
    if disp.experiment_id:
        experiment = (
            db.query(Experiment)
            .filter(Experiment.id == disp.experiment_id)
            .first()
        )
        if not experiment:
            raise CRUDNotFoundError(f"Experiment {disp.experiment_id} not found.")

    # 3. Create disposal record
    db_disp = Disposal(
        animal_id=disp.animal_id,
        experiment_id=disp.experiment_id,
        date=disp.date,
        method=disp.method,
        reason=disp.reason,
        remarks=disp.remarks,
    )

    db.add(db_disp)

    # 4. Update animal status
    if disp.method.lower() in ["sacrifice", "sacrificed"]:
        animal.status = "sacrificed"
    elif disp.method.lower() in ["euthanasia", "euthanized"]:
        animal.status = "euthanized"
    else:
        animal.status = "dead"

    db.add(animal)

    try:
        db.commit()
        db.refresh(db_disp)
        db.refresh(animal)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc))

    return db_disp


def get_disposal(db: Session, disp_id: int):
    return (
        db.query(Disposal)
        .filter(Disposal.id == disp_id)
        .first()
    )
