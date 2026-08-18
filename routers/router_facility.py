from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from datetime import date

from crud import admin_facility as facility_crud
from crud import cage_labels as cage_label_crud
from crud import facility_dashboard as dashboard_crud
from crud import facility_environment as environment_crud
from crud import facility_operations as operations_crud
from crud import supply_inventory as supply_crud
from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from crud.formb_membership import user_can_view_project
from crud.formc_documents import render_form_c_pdf
from crud.crud_inventory import get_form_c_data
from database.database import get_db
from database.lmcpafm_models import ExperimentGroup
from dependencies.auth import require_any_role, user_role_names
from models.user import User
from schemas.schemas_admin_facility import (
    AnimalAdminRead,
    AnimalLabelRead,
    AnimalTimelineEventRead,
    CageLabelRead,
    CageMapRoomRead,
    CageRead,
    FacilityCareLogCreate,
    FacilityCareLogRead,
    FacilityEnvironmentLogCreate,
    FacilityEnvironmentLogRead,
    FacilityOperationsSummaryRead,
    FacilityRoomRead,
    FacilitySummaryRead,
    PiDashboardRead,
    ProcurementRead,
    BreedingRecordRead,
    RoomDashboardRead,
    StrainDashboardRead,
)
from schemas.schemas_inventory import FormCData
from schemas.schemas_supply import (
    SupplyItemRead,
    SupplyStaffTransactionCreate,
    SupplyTransactionRead,
)

router = APIRouter(prefix="/facility", tags=["Facility"])

PRIVILEGED_FACILITY_ROLES = {"staff", "admin", "iaec"}


def _ensure_group_label_access(db: Session, user: User, group_id: int) -> None:
    group = db.query(ExperimentGroup).filter(ExperimentGroup.id == group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Experiment group not found.")
    roles = set(user_role_names(user))
    if not roles.isdisjoint(PRIVILEGED_FACILITY_ROLES):
        return
    if not user_can_view_project(db, user.id, group.project_id):
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/summary", response_model=FacilitySummaryRead)
def read_facility_summary(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return facility_crud.get_facility_summary(db)


@router.get("/rooms", response_model=list[FacilityRoomRead])
def list_rooms(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return facility_crud.list_rooms(db)


@router.get("/cages", response_model=list[CageRead])
def list_cages(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return facility_crud.list_cages(db)


@router.get("/cage-map", response_model=list[CageMapRoomRead])
def read_cage_map(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return facility_crud.get_cage_map(db)


@router.get("/animals", response_model=list[AnimalAdminRead])
def list_animals(
    status: str | None = Query(None),
    species_id: int | None = Query(None),
    room_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return facility_crud.list_animals(db, status=status, species_id=species_id, room_id=room_id)


@router.get("/animals/{animal_id}", response_model=AnimalAdminRead)
def get_animal(
    animal_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        return facility_crud.get_animal(db, animal_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/animals/{animal_id}/timeline", response_model=list[AnimalTimelineEventRead])
def read_animal_timeline(
    animal_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        return facility_crud.get_animal_timeline(db, animal_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/labels/groups/{group_id}/cages/download")
def download_group_cage_labels(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("investigator", "staff", "admin", "iaec")),
):
    _ensure_group_label_access(db, current_user, group_id)
    try:
        pdf_bytes = cage_label_crud.render_group_cage_labels_pdf(db, group_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    filename = f"group_cage_labels_{group_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/labels/cages/download")
def download_bulk_cage_labels(
    category: str = Query(..., description="quarantine, available, or rehabilitated"),
    room_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        pdf_bytes = cage_label_crud.render_bulk_cage_labels_pdf(db, category, room_id=room_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    filename = f"cage_labels_{category.strip().lower()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/cages/{cage_id}/label", response_model=CageLabelRead)
def read_cage_label(
    cage_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        return cage_label_crud.build_cage_label_context(db, cage_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/cages/{cage_id}/label/download")
def download_cage_label(
    cage_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        pdf_bytes = cage_label_crud.render_cage_label_pdf(db, cage_id)
        context = cage_label_crud.build_cage_label_context(db, cage_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    safe_label = context["cage_label"].replace("/", "-")
    filename = f"cage_label_{safe_label}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/animals/{animal_id}/label", response_model=AnimalLabelRead)
def read_animal_label(
    animal_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        return facility_crud.get_animal_label_data(db, animal_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/animals/{animal_id}/label/download")
def download_animal_label(
    animal_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        pdf_bytes = facility_crud.render_animal_label_pdf(db, animal_id)
        label = facility_crud.get_animal_label_data(db, animal_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    filename = f"label_{label['animal_number'].replace('/', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/procurements", response_model=list[ProcurementRead])
def list_procurements(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return facility_crud.list_procurements(db)


@router.get("/breeding", response_model=list[BreedingRecordRead])
def list_breeding_records(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return facility_crud.list_breeding_records(db)


@router.get("/care-logs", response_model=list[FacilityCareLogRead])
def list_care_logs(
    log_type: str | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return facility_crud.list_care_logs(db, log_type=log_type)


@router.post("/care-logs", response_model=FacilityCareLogRead)
def create_care_log(
    payload: FacilityCareLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        return facility_crud.create_care_log(db, current_user, payload)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/dashboard/pi", response_model=PiDashboardRead)
def read_pi_dashboard(
    protocol_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        return dashboard_crud.get_pi_dashboard(db, protocol_id=protocol_id)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/dashboard/rooms", response_model=RoomDashboardRead)
def read_room_dashboard(
    stale_days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return dashboard_crud.get_room_dashboard(db, stale_days=stale_days)


@router.get("/dashboard/strains", response_model=StrainDashboardRead)
def read_strain_dashboard(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return dashboard_crud.get_strain_dashboard(db)


@router.get("/supplies/items", response_model=list[SupplyItemRead])
def list_supply_items(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return supply_crud.list_supply_items(db)


@router.get("/supplies/transactions", response_model=list[SupplyTransactionRead])
def list_supply_transactions(
    item_id: int | None = Query(None),
    txn_type: str | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return supply_crud.list_supply_transactions(db, item_id=item_id, txn_type=txn_type)


@router.post("/supplies/transactions", response_model=SupplyTransactionRead)
def record_supply_usage(
    payload: SupplyStaffTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        return supply_crud.record_staff_supply_usage(db, current_user, payload)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/operations-summary", response_model=FacilityOperationsSummaryRead)
def read_operations_summary(
    stale_days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return operations_crud.get_operations_summary(db, stale_days=stale_days)


@router.get("/environment-logs", response_model=list[FacilityEnvironmentLogRead])
def list_environment_logs(
    room_id: int | None = Query(None),
    log_date: date | None = Query(None, alias="date"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return environment_crud.list_environment_logs(db, room_id=room_id, log_date=log_date)


@router.post("/environment-logs", response_model=FacilityEnvironmentLogRead)
def create_environment_log(
    payload: FacilityEnvironmentLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("staff", "admin")),
):
    try:
        return environment_crud.create_environment_log(db, current_user, payload)
    except CRUDNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/form-c-data", response_model=FormCData)
def read_form_c_data(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    return get_form_c_data(db)


@router.get("/form-c/download")
def download_form_c_pdf(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_role("staff", "admin")),
):
    pdf_bytes = render_form_c_pdf(db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Form_C_Register.pdf"'},
    )
