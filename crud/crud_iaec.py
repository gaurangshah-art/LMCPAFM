# crud/iaec.py

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload
from database.lmcpafm_models import IAECProject, ExperimentGroup, AnimalExperiment
from schemas.schemas_iaec import (
    IAECProjectCreate,
    ExperimentGroupCreate,
    AnimalExperimentCreate
)
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError

def create_project(db: Session, project: IAECProjectCreate):
    project_data = project.model_dump(exclude_unset=True)
    db_project = IAECProject(**project_data)
    db.add(db_project)
    try:
        db.commit()
        db.refresh(db_project)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc))
    return db_project


def get_projects(db: Session):
    return (
        db.query(IAECProject)
        .options(
            selectinload(IAECProject.experiment_groups).selectinload(
                ExperimentGroup.experiments
            )
        )
        .all()
    )


def create_group(db: Session, group: ExperimentGroupCreate):
    project = db.query(IAECProject).filter(IAECProject.id == group.project_id).first()
    if not project:
        raise CRUDNotFoundError(f"IAEC project {group.project_id} not found.")

    db_group = ExperimentGroup(**group.model_dump(exclude_unset=True))
    db.add(db_group)
    try:
        db.commit()
        db.refresh(db_group)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc))
    return db_group


def get_groups_by_project(db: Session, project_id: int):
    return (
        db.query(ExperimentGroup)
        .filter(ExperimentGroup.project_id == project_id)
        .options(selectinload(ExperimentGroup.experiments))
        .all()
    )


def get_project(db: Session, project_id: int):
    return (
        db.query(IAECProject)
        .filter(IAECProject.id == project_id)
        .options(
            selectinload(IAECProject.experiment_groups).selectinload(
                ExperimentGroup.experiments
            )
        )
        .first()
    )


def create_experiment(db: Session, experiment: AnimalExperimentCreate):
    group = db.query(ExperimentGroup).filter(ExperimentGroup.id == experiment.group_id).first()
    if not group:
        raise CRUDNotFoundError(f"Experiment group {experiment.group_id} not found.")

    db_exp = AnimalExperiment(**experiment.model_dump(exclude_unset=True))
    db.add(db_exp)
    try:
        db.commit()
        db.refresh(db_exp)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc))
    return db_exp


def get_experiments_by_group(db: Session, group_id: int):
    return (
        db.query(AnimalExperiment)
        .filter(AnimalExperiment.group_id == group_id)
        .all()
    )
