from dependencies.auth import get_current_user, require_any_role, require_iaec, require_investigator

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import SessionLocal
from database.lmcpafm_models import IAECMeeting
from crud import crud_iaec
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from crud.formb_internal import (
    assign_form_b_meeting as assign_form_b_meeting_crud,
    form_b_to_protocol_read,
    form_b_to_record_read,
    generate_form_b_protocol_number as generate_form_b_protocol_number_crud,
    get_form_b_by_id,
    get_meeting_certificate_data,
    get_meeting_form_b_summary,
    list_form_b_with_meeting,
    upsert_form_b_meeting_decision as upsert_form_b_meeting_decision_crud,
)
from crud.formb_documents import (
    build_project_certificate_data,
    render_meeting_summary_pdf,
    render_project_certificate_pdf,
)
from crud.formb_email import (
    queue_form_b_meeting_invitation_email,
    send_form_b_meeting_invitation_email,
    validate_form_b_meeting_invitation_ready,
)
from crud.formb_membership import user_can_view_approval_letter, user_can_view_project
from models.user import User
from schemas.schemas_iaec import (
    IAECProjectCreate,
    IAECProject,
    ExperimentGroupCreate,
    ExperimentGroup,
    AnimalExperimentCreate,
    AnimalExperiment,
    IAECMeetingCreate,
    IAECMeetingRead,
)
from schemas.schemas_formb import (
    FormBRecordRead,
    FormBMeetingAssign,
    FormBProtocolRead,
    FormBWithMeetingRead,
    FormBMeetingDecisionUpsert,
    FormBMeetingDecisionRead,
    FormBMeetingSummaryRead,
    FormBMeetingCertificateRead,
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


@router.get("/project/investigator/{investigator_id}", response_model=list[IAECProject])
def get_investigator_projects(
    investigator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("investigator", "iaec", "admin", "staff")),
):
    if (
        _user_role_names(current_user).isdisjoint({"iaec", "admin", "staff"})
        and current_user.id != investigator_id
    ):
        raise HTTPException(status_code=403, detail="Forbidden")
    return crud_iaec.get_projects_by_investigator(db, investigator_id)


def _user_role_names(user: User) -> set[str]:
    names = {role.name for role in user.roles}
    if user.role:
        names.add(user.role)
    return names


@router.get("/project/{project_id}", response_model=IAECProject)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = crud_iaec.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    roles = _user_role_names(current_user)
    if roles.isdisjoint({"iaec", "admin", "staff"}):
        if not user_can_view_project(db, current_user.id, project_id):
            raise HTTPException(status_code=403, detail="Forbidden")

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


@router.get("/meeting", response_model=list[IAECMeetingRead])
def list_meetings(
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    return (
        db.query(IAECMeeting)
        .order_by(IAECMeeting.date.desc(), IAECMeeting.id.desc())
        .all()
    )


@router.post("/meeting", response_model=IAECMeetingRead)
def create_meeting(
    payload: IAECMeetingCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    meeting = IAECMeeting(
        date=payload.date,
        meeting_number=payload.meeting_number,
        minutes=payload.minutes,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/form-b-with-meeting", response_model=list[FormBWithMeetingRead])
def read_form_b_with_meeting(
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    return list_form_b_with_meeting(db)


@router.get("/form-b/{form_b_id}", response_model=FormBRecordRead)
def read_form_b_record(
    form_b_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    try:
        form_b = get_form_b_by_id(db, form_b_id)
        return form_b_to_record_read(db, form_b)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/form-b/{form_b_id}/meeting", response_model=FormBRecordRead)
def assign_form_b_meeting(
    form_b_id: int,
    payload: FormBMeetingAssign,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    try:
        return assign_form_b_meeting_crud(db, form_b_id, payload.meeting_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error")


@router.post("/form-b/{form_b_id}/protocol-number", response_model=FormBProtocolRead)
def generate_form_b_protocol_number(
    form_b_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    try:
        form_b, _protocol_number = generate_form_b_protocol_number_crud(db, form_b_id)
        return form_b_to_protocol_read(db, form_b)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error")


@router.post("/form-b/{form_b_id}/send-meeting-invitation")
def send_form_b_meeting_invitation(
    form_b_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    try:
        validate_form_b_meeting_invitation_ready(db, form_b_id)
        queue_form_b_meeting_invitation_email(background_tasks, form_b_id)
        return {"ok": True, "queued": True}
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/form-b/{form_b_id}/send-meeting-invitation/sync")
def send_form_b_meeting_invitation_sync(
    form_b_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    try:
        send_form_b_meeting_invitation_email(db, form_b_id)
        return {"ok": True}
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/form-b/{form_b_id}/decision", response_model=FormBMeetingDecisionRead)
def upsert_form_b_meeting_decision(
    form_b_id: int,
    payload: FormBMeetingDecisionUpsert,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    try:
        return upsert_form_b_meeting_decision_crud(
            db,
            form_b_id,
            payload.meeting_id,
            payload.decision.value,
            payload.approved_animal_count,
            payload.remarks,
        )
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except CRUDDatabaseError:
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/meeting/{meeting_id}/form-b-summary", response_model=list[FormBMeetingSummaryRead])
def read_meeting_form_b_summary(
    meeting_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    try:
        return get_meeting_form_b_summary(db, meeting_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/meeting/{meeting_id}/certificate-data", response_model=list[FormBMeetingCertificateRead])
def read_meeting_certificate_data(
    meeting_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    try:
        rows = get_meeting_certificate_data(db, meeting_id)
        return [
            {
                **row,
                "decision": row["decision"],
            }
            for row in rows
        ]
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/meeting/{meeting_id}/details")
def read_meeting_details(
    meeting_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    try:
        return crud_iaec.get_meeting_details(db, meeting_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/meeting/{meeting_id}/summary/download")
def download_meeting_summary_pdf(
    meeting_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    from fastapi.responses import Response

    try:
        pdf_bytes = render_meeting_summary_pdf(db, meeting_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="meeting_{meeting_id}_summary.pdf"'},
        )
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/project/{project_id}/form-b")
def read_project_form_b(
    project_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_iaec),
):
    from database.lmcpafm_models import FormB

    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    if form_b is None:
        raise HTTPException(status_code=404, detail="Form B not found for project")
    return form_b_to_record_read(db, form_b)


@router.get("/project/{project_id}/certificate")
def read_project_certificate(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    roles = _user_role_names(current_user)
    if roles.isdisjoint({"iaec", "admin", "staff"}):
        if not user_can_view_approval_letter(db, current_user.id, project_id):
            raise HTTPException(status_code=403, detail="Forbidden")
    try:
        return build_project_certificate_data(db, project_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/project/{project_id}/certificate/download")
def download_project_certificate(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi.responses import Response

    roles = _user_role_names(current_user)
    if roles.isdisjoint({"iaec", "admin", "staff"}):
        if not user_can_view_approval_letter(db, current_user.id, project_id):
            raise HTTPException(status_code=403, detail="Forbidden")
    try:
        pdf_bytes = render_project_certificate_pdf(db, project_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="iaec_certificate_{project_id}.pdf"'
            },
        )
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
