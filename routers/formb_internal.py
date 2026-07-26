from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from database.lmcpafm_models import FormB, FormBInvestigator
from crud.formb_internal import get_formb_by_protocol, update_formb
from schemas.schemas_formb import (
    FormBBase,
    FormBRead,
    FormBInvestigatorCreate,
    FormBInvestigatorRead,
)

router = APIRouter(prefix="/formb", tags=["Form-B Internal"])


@router.post("/investigators", response_model=FormBInvestigatorRead)
def create_formb_investigator(
    payload: FormBInvestigatorCreate,
    db: Session = Depends(get_db),
):
    form_b = db.query(FormB).filter(FormB.id == payload.form_b_id).first()
    if form_b is None:
        raise HTTPException(status_code=404, detail="Form B not found")

    investigator = FormBInvestigator(
        form_b_id=payload.form_b_id,
        name=payload.name,
        role=payload.role,
        user_id=payload.user_id,
        investigator_type=payload.investigator_type,
        can_view_status=payload.can_view_status,
        can_view_approval_letters=payload.can_view_approval_letters,
        can_edit_forms=payload.can_edit_forms,
        can_submit_form_b=payload.can_submit_form_b,
    )

    db.add(investigator)
    db.commit()
    db.refresh(investigator)
    return investigator


@router.get("/{form_b_id}/investigators", response_model=list[FormBInvestigatorRead])
def list_formb_investigators(
    form_b_id: int,
    db: Session = Depends(get_db),
):
    form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
    if form_b is None:
        raise HTTPException(status_code=404, detail="Form B not found")

    investigators = (
        db.query(FormBInvestigator)
        .filter(FormBInvestigator.form_b_id == form_b_id)
        .order_by(FormBInvestigator.id.asc())
        .all()
    )
    return investigators


@router.get("/{protocol_number}", response_model=FormBRead)
def fetch_form_b(protocol_number: str, db: Session = Depends(get_db)):
    project = get_formb_by_protocol(db, protocol_number)
    if not project:
        raise HTTPException(status_code=404, detail="Form B not found")

    return FormBRead(
        id=project.id,
        protocol_number=project.protocol_number,
        title=project.title,
        principal_investigator=project.principal_investigator,
        purpose=project.purpose,
        approval_date=project.approval_date,
    )


@router.put("/{project_id}", response_model=FormBRead)
def update_form_b_details(
    project_id: int,
    payload: FormBBase,
    db: Session = Depends(get_db),
):
    project = update_formb(db, project_id, payload)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return FormBRead(
        id=project.id,
        protocol_number=project.protocol_number,
        title=project.title,
        principal_investigator=project.principal_investigator,
        purpose=project.purpose,
        approval_date=project.approval_date,
    )