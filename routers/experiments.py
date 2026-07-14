from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import SessionLocal
from crud.crud_experiments import create_experiment, get_experiment
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from schemas.schemas_experiments import ExperimentCreate, Experiment
from database.lmcpafm_experiments import ExperimentAnimal


router = APIRouter(prefix="/experiment", tags=["Experiment Workflow"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=Experiment)
def submit_experiment(exp: ExperimentCreate, db: Session = Depends(get_db)):
    try:
        db_exp = create_experiment(db, exp)

        links = (
            db.query(ExperimentAnimal)
            .filter(ExperimentAnimal.experiment_id == db_exp.id)
            .all()
        )

        animals = [
            {"id": link.id, "animal_id": link.animal_id, "experiment_id": link.experiment_id}
            for link in links
        ]

        return Experiment(
            id=db_exp.id,
            protocol_id=db_exp.protocol_id,
            allocation_id=db_exp.allocation_id,
            date=db_exp.date,
            performed_by=db_exp.performed_by,
            purpose=db_exp.purpose,
            procedure=db_exp.procedure,
            dose=db_exp.dose,
            observations=db_exp.observations,
            start_time=db_exp.start_time,
            end_time=db_exp.end_time,
            animals=animals,
        )
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError as exc:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{exp_id}", response_model=Experiment)
def read_experiment(exp_id: int, db: Session = Depends(get_db)):
    db_exp = get_experiment(db, exp_id)
    if not db_exp:
        raise HTTPException(status_code=404, detail="Experiment not found.")

    links = (
        db.query(ExperimentAnimal)
        .filter(ExperimentAnimal.experiment_id == db_exp.id)
        .all()
    )

    animals = [
        {"id": link.id, "animal_id": link.animal_id, "experiment_id": link.experiment_id}
        for link in links
    ]

    return Experiment(
        id=db_exp.id,
        protocol_id=db_exp.protocol_id,
        allocation_id=db_exp.allocation_id,

        date=db_exp.date,
        performed_by=db_exp.performed_by,
        purpose=db_exp.purpose,

        procedure=db_exp.procedure,
        dose=db_exp.dose,
        observations=db_exp.observations,

        start_time=db_exp.start_time,
        end_time=db_exp.end_time,

        animals=animals,
    )
