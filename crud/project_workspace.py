from __future__ import annotations

from sqlalchemy.orm import Session, selectinload

from crud.crud_experiments import list_experiments_by_protocol
from crud.crud_iaec import get_groups_by_project, get_project
from crud.crud_requisition_allocation import list_requisitions_by_protocol
from crud.exceptions import CRUDNotFoundError
from crud.experiment_group_planning import get_experiment_planning_status
from crud.formb_investigator import list_form_b_investigators
from crud.formb_membership import user_can_view_project
from database.lmcpafm_models import FormB
from database.lmcpafm_requisition_allocation import AnimalAllocation
from models.user import User


def get_project_workspace(
    db: Session,
    user: User,
    project_id: int,
    privileged: bool = False,
) -> dict:
    project = get_project(db, project_id)
    if project is None:
        raise CRUDNotFoundError(f"IAEC project {project_id} not found.")

    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    investigators = []
    if form_b is not None:
        if privileged:
            from database.lmcpafm_models import FormBInvestigator

            investigators = (
                db.query(FormBInvestigator)
                .filter(FormBInvestigator.form_b_id == form_b.id)
                .order_by(FormBInvestigator.id.asc())
                .all()
            )
        else:
            investigators = list_form_b_investigators(db, user, form_b.id)

    groups = get_groups_by_project(db, project_id)
    planning = get_experiment_planning_status(db, project_id)
    requisitions = list_requisitions_by_protocol(db, project_id)

    allocations: list[AnimalAllocation] = []
    if requisitions:
        requisition_ids = [req.id for req in requisitions]
        allocations = (
            db.query(AnimalAllocation)
            .filter(AnimalAllocation.requisition_id.in_(requisition_ids))
            .options(selectinload(AnimalAllocation.items))
            .order_by(AnimalAllocation.date.desc(), AnimalAllocation.id.asc())
            .all()
        )

    experiments = list_experiments_by_protocol(db, project_id)

    return {
        "project": project,
        "form_b_id": form_b.id if form_b else None,
        "investigators": investigators,
        "planning": planning,
        "groups": groups,
        "requisitions": requisitions,
        "allocations": allocations,
        "experiments": experiments,
        "workflow": {
            "planning_complete": planning["is_complete"],
            "has_requisition": len(requisitions) > 0,
            "has_allocation": len(allocations) > 0,
            "has_experiment_log": len(experiments) > 0,
            "can_create_requisition": planning["can_create_requisition"],
        },
    }


def user_can_access_workspace(db: Session, user: User, project_id: int, privileged: bool) -> bool:
    if privileged:
        return True
    return user_can_view_project(db, user.id, project_id)
