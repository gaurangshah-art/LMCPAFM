# crud/iaec.py

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_
from database.lmcpafm_models import IAECProject, ExperimentGroup, AnimalExperiment
from schemas.schemas_iaec import (
    IAECProjectCreate,
    ExperimentGroupCreate,
    AnimalExperimentCreate
)
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from crud.experiment_group_planning import (
    assert_project_approved_for_planning,
    validate_group_planned_count,
)

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
    assert_project_approved_for_planning(db, group.project_id)
    validate_group_planned_count(db, group.project_id, group.planned_animal_count)

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


def get_projects_by_investigator(db: Session, user_id: int):
    from database.lmcpafm_models import FormB, FormBInvestigator

    return (
        db.query(IAECProject)
        .join(FormB, FormB.project_id == IAECProject.id)
        .join(FormBInvestigator, FormBInvestigator.form_b_id == FormB.id)
        .filter(
            FormBInvestigator.user_id == user_id,
            or_(
                FormBInvestigator.can_view_status.is_(True),
                FormBInvestigator.can_edit_forms.is_(True),
                FormBInvestigator.can_submit_form_b.is_(True),
                FormBInvestigator.can_view_approval_letters.is_(True),
            ),
        )
        .distinct()
        .options(
            selectinload(IAECProject.experiment_groups).selectinload(
                ExperimentGroup.experiments
            )
        )
        .order_by(IAECProject.id.desc())
        .all()
    )


def get_investigator_project_summaries(db: Session, user_id: int) -> list[dict]:
    from database.lmcpafm_models import FormB

    projects = get_projects_by_investigator(db, user_id)
    summaries: list[dict] = []

    for project in projects:
        form_b = (
            db.query(FormB)
            .options(joinedload(FormB.meeting))
            .filter(FormB.project_id == project.id)
            .first()
        )
        meeting = form_b.meeting if form_b else None
        groups = project.experiment_groups or []
        experiment_count = sum(len(group.experiments or []) for group in groups)

        summaries.append(
            {
                "id": project.id,
                "title": project.title,
                "investigator_name": project.investigator_name,
                "protocol_number": project.protocol_number,
                "approval_date": project.approval_date,
                "principal_investigator": project.principal_investigator,
                "status": project.status,
                "form_b_id": form_b.id if form_b else None,
                "meeting_id": form_b.meeting_id if form_b else None,
                "meeting_year": meeting.date.year if meeting and meeting.date else None,
                "meeting_number": meeting.meeting_number if meeting else None,
                "submitted_at": form_b.submitted_at.isoformat() if form_b and form_b.submitted_at else None,
                "experiment_group_count": len(groups),
                "experiment_count": experiment_count,
            }
        )

    return summaries


def get_meeting_details(db: Session, meeting_id: int):
    from database.lmcpafm_models import FormB, FormBMeetingDecision, IAECMeeting

    meeting = db.query(IAECMeeting).filter(IAECMeeting.id == meeting_id).first()
    if not meeting:
        raise CRUDNotFoundError(f"IAEC meeting {meeting_id} not found.")

    assigned = (
        db.query(FormB, IAECProject, FormBMeetingDecision)
        .join(IAECProject, IAECProject.id == FormB.project_id)
        .outerjoin(
            FormBMeetingDecision,
            (FormBMeetingDecision.form_b_id == FormB.id)
            & (FormBMeetingDecision.meeting_id == FormB.meeting_id),
        )
        .filter(FormB.meeting_id == meeting_id)
        .order_by(FormB.id.asc())
        .all()
    )
    assigned_projects = [
        {
            "project_id": project.id,
            "form_b_id": form_b.id,
            "title": project.title,
            "investigator_name": project.investigator_name,
            "status": project.status,
            "protocol_number": project.protocol_number,
            "decision": decision.decision if decision else None,
        }
        for form_b, project, decision in assigned
    ]
    return {"meeting": meeting, "assigned_projects": assigned_projects}


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
