from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from crud.formb_attachments import (
    delete_form_b_attachment,
    get_form_b_attachment,
    list_form_b_attachments,
    read_attachment_bytes,
    upload_form_b_attachment,
)
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
from crud.formb_investigator import add_form_b_investigator, list_form_b_investigators, remove_form_b_investigator
from dependencies.auth import require_investigator
from models.user import User
from schemas.schemas_formb import (
    FormBAttachmentRead,
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
    current_user: User = Depends(require_investigator),
):
    try:
        return add_form_b_investigator(db, current_user, payload.model_dump())
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{form_b_id}/investigators", response_model=list[FormBInvestigatorRead])
def list_formb_investigators(
    form_b_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    try:
        return list_form_b_investigators(db, current_user, form_b_id)
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{form_b_id}/investigators/{investigator_id}")
def delete_formb_investigator(
    form_b_id: int,
    investigator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    try:
        remove_form_b_investigator(db, current_user, form_b_id, investigator_id)
        return {"ok": True}
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{form_b_id}/attachments", response_model=list[FormBAttachmentRead])
def list_formb_attachments(
    form_b_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    try:
        return list_form_b_attachments(db, current_user, form_b_id)
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{form_b_id}/attachments", response_model=FormBAttachmentRead)
async def upload_formb_attachment(
    form_b_id: int,
    category: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    content = await file.read()
    try:
        return upload_form_b_attachment(
            db,
            current_user,
            form_b_id,
            category,
            file.filename or "attachment.bin",
            file.content_type,
            content,
        )
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{form_b_id}/attachments/{attachment_id}")
def download_formb_attachment(
    form_b_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    from fastapi.responses import Response

    try:
        attachment = get_form_b_attachment(db, current_user, form_b_id, attachment_id)
        content, filename, content_type = read_attachment_bytes(attachment)
        return Response(
            content=content,
            media_type=content_type or "application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{form_b_id}/attachments/{attachment_id}")
def delete_formb_attachment(
    form_b_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    try:
        delete_form_b_attachment(db, current_user, form_b_id, attachment_id)
        return {"ok": True}
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{form_b_id}/application.pdf")
def download_form_b_application_pdf(
    form_b_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_investigator),
):
    from fastapi.responses import Response

    from crud.formb_documents import render_form_b_application_pdf
    from crud.formb_membership import get_member_form_b

    try:
        form_b = get_member_form_b(db, current_user, form_b_id)
        pdf_bytes = render_form_b_application_pdf(db, form_b.project_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="form_b_{form_b_id}.pdf"'},
        )
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
