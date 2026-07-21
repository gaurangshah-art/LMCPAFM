from sqlalchemy.orm import Session
from database.lmcpafm_models import IAECProject
from schemas.formb_internal import FormBBase

def get_formb_by_protocol(db: Session, protocol_number: str) -> IAECProject | None:
    return (
        db.query(IAECProject)
        .filter(IAECProject.protocol_number == protocol_number)
        .first()
    )

def update_formb(db: Session, project_id: int, data: FormBBase) -> IAECProject:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if not project:
        return None

    project.protocol_number = data.protocol_number
    project.title = data.title
    project.principal_investigator = data.principal_investigator
    project.purpose = data.purpose
    project.approval_date = data.approval_date

    db.commit()
    db.refresh(project)
    return project
