from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from crud.exceptions import CRUDValidationError
from crud.formb_internal import get_formb_by_protocol, update_formb
from crud.formb_wizard import (
    build_form_b_step1_autofill,
    get_form_b_review,
    save_form_b_step,
    save_form_b_step1,
    start_form_b,
    submit_form_b,
)
from database.database import get_db
from database.lmcpafm_models import FormB, FormBInvestigator
from dependencies.auth import require_investigator
from models.user import User
from schemas.schemas_formb import (
    FormBBase,
    FormBInvestigatorCreate,
    FormBInvestigatorRead,
    FormBRead,
    FormBReviewRead,
    FormBStartRead,
    FormBStep1AutofillRead,
    FormBStep1Save,
    FormBStep2Save,
    FormBStep3Save,
    FormBStep4Save,
    FormBStep5Save,
    FormBStep6Save,
    FormBStep7Save,
    FormBSubmitRequest,
)

router = APIRouter(prefix="/formb", tags=["Form-B Internal"])


@router.get("/autofill/step-1", response_model=FormBStep1AutofillRead)
def read_form_b_step1_autofill(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    return build_form_b_step1_autofill(db, current_user)


@router.post("/start", response_model=FormBStartRead)
def create_form_b_draft(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    try:
        form_b = start_form_b(db, current_user)
        return {"id": form_b.id, "project_id": form_b.project_id}
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/step-1")
def save_form_b_step1_details(
    payload: FormBStep1Save,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    try:
        save_form_b_step1(db, current_user, payload.form_b_id, payload.model_dump())
        return {"ok": True}
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _save_step_endpoint(step_key: str, payload, db, current_user):
    data = payload.model_dump()
    form_b_id = data.pop("form_b_id")
    try:
        save_form_b_step(db, current_user, form_b_id, step_key, data)
        return {"ok": True}
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/step-2")
def save_form_b_step2_details(
    payload: FormBStep2Save,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    return _save_step_endpoint("step2", payload, db, current_user)


@router.post("/step-3")
def save_form_b_step3_details(
    payload: FormBStep3Save,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    return _save_step_endpoint("step3", payload, db, current_user)


@router.post("/step-4")
def save_form_b_step4_details(
    payload: FormBStep4Save,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    return _save_step_endpoint("step4", payload, db, current_user)


@router.post("/step-5")
def save_form_b_step5_details(
    payload: FormBStep5Save,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    return _save_step_endpoint("step5", payload, db, current_user)


@router.post("/step-6")
def save_form_b_step6_details(
    payload: FormBStep6Save,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    return _save_step_endpoint("step6", payload, db, current_user)


@router.post("/step-7")
def save_form_b_step7_details(
    payload: FormBStep7Save,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    return _save_step_endpoint("step7", payload, db, current_user)


@router.get("/{form_b_id}/review", response_model=FormBReviewRead)
def read_form_b_review(
    form_b_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    try:
        return get_form_b_review(db, current_user, form_b_id)
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/submit")
def submit_form_b_application(
    payload: FormBSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    try:
        submit_form_b(db, current_user, payload.form_b_id)
        return {"ok": True}
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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


@router.get("/by-protocol/{protocol_number}", response_model=FormBRead)
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


@router.put("/project/{project_id}", response_model=FormBRead)
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
