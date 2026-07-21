from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from crud.formb_internal import get_formb_by_protocol, update_formb
from schemas.formb_internal import FormBBase, FormBRead

router = APIRouter(prefix="/formb", tags=["Form-B Internal"])

@router.get("/{protocol_number}", response_model=FormBRead)
def fetch_formb(protocol_number: str, db: Session = Depends(get_db)):
    project = get_formb_by_protocol(db, protocol_number)
    if not project:
        raise HTTPException(status_code=404, detail="Form B not found")

    return FormBRead(
        project_id=project.id,
        protocol_number=project.protocol_number,
        title=project.title,
        principal_investigator=project.principal_investigator,
        purpose=project.purpose,
        approval_date=project.approval_date,
    )

@router.put("/{project_id}", response_model=FormBRead)
def update_formb_details(project_id: int, payload: FormBBase, db: Session = Depends(get_db)):
    project = update_formb(db, project_id, payload)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return FormBRead(
        project_id=project.id,
        protocol_number=project.protocol_number,
        title=project.title,
        principal_investigator=project.principal_investigator,
        purpose=project.purpose,
        approval_date=project.approval_date,
    )
