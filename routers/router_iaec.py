from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import SessionLocal
from crud import crud_iaec
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from schemas.schemas_iaec import (
    IAECProjectCreate, IAECProject,
    ExperimentGroupCreate, ExperimentGroup,
    AnimalExperimentCreate, AnimalExperiment,
)

router = APIRouter(prefix="/iaec", tags=["IAEC"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/project", response_model=IAECProject)
def create_project(project: IAECProjectCreate, db: Session = Depends(get_db)):
    try:
        return crud_iaec.create_project(db, project)
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/project", response_model=list[IAECProject])
def get_projects(db: Session = Depends(get_db)):
    return crud_iaec.get_projects(db)


@router.get("/project/{project_id}", response_model=IAECProject)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = crud_iaec.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.post("/group", response_model=ExperimentGroup)
def create_group(group: ExperimentGroupCreate, db: Session = Depends(get_db)):
    try:
        return crud_iaec.create_group(db, group)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/group/{project_id}", response_model=list[ExperimentGroup])
def get_groups(project_id: int, db: Session = Depends(get_db)):
    return crud_iaec.get_groups_by_project(db, project_id)


@router.post("/experiment", response_model=AnimalExperiment)
def create_experiment(exp: AnimalExperimentCreate, db: Session = Depends(get_db)):
    try:
        return crud_iaec.create_experiment(db, exp)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/experiment/{group_id}", response_model=list[AnimalExperiment])
def get_experiments(group_id: int, db: Session = Depends(get_db)):
    return crud_iaec.get_experiments_by_group(db, group_id)
