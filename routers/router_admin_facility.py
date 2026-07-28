from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from crud import admin_facility as facility_crud
from crud import cage_labels as cage_label_crud
from crud import facility_dashboard as dashboard_crud
from crud import supply_inventory as supply_crud
from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from database.database import get_db
from dependencies.auth import require_admin
from models.user import User
from schemas.schemas_admin_facility import (
    AnimalAdminCreate,
    AnimalAdminRead,
    AnimalAdminUpdate,
    AnimalMoveRequest,
    AnimalOutcomeCreate,
    AnimalOutcomeRead,
    AnimalWeightCreate,
    AnimalWeightRead,
    BreedingRecordCreate,
    BreedingRecordRead,
    CageCreate,
    CageRead,
    CageUpdate,
    FacilityCareLogCreate,
    FacilityCareLogRead,
    FacilityRoomCreate,
    FacilityRoomRead,
    FacilityRoomUpdate,
    FacilitySummaryRead,
    PiDashboardRead,
    ProcurementCreate,
    ProcurementRead,
    RoomDashboardRead,
    StrainDashboardRead,
    CageMapRoomRead,
    AnimalTimelineEventRead,
    AnimalLabelRead,
    CageLabelRead,
)
from schemas.schemas_supply import (
    SupplyItemCreate,
    SupplyItemRead,
    SupplyItemUpdate,
    SupplyTransactionCreate,
    SupplyTransactionRead,
)

router = APIRouter(prefix="/admin/facility", tags=["Admin Facility"])


def _handle_errors(exc: Exception):
    if isinstance(exc, CRUDNotFoundError):
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if isinstance(exc, CRUDValidationError):
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/summary", response_model=FacilitySummaryRead)
def read_facility_summary(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return facility_crud.get_facility_summary(db)


@router.get("/rooms", response_model=list[FacilityRoomRead])
def list_rooms(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return facility_crud.list_rooms(db)


@router.post("/rooms", response_model=FacilityRoomRead)
def create_room(
    payload: FacilityRoomCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.create_room(db, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.put("/rooms/{room_id}", response_model=FacilityRoomRead)
def update_room(
    room_id: int,
    payload: FacilityRoomUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.update_room(db, room_id, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/cages", response_model=list[CageRead])
def list_cages(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return facility_crud.list_cages(db)


@router.post("/cages", response_model=CageRead)
def create_cage(
    payload: CageCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        cage = facility_crud.create_cage(db, payload)
        rows = facility_crud.list_cages(db)
        return next(row for row in rows if row["id"] == cage.id)
    except Exception as exc:
        _handle_errors(exc)


@router.put("/cages/{cage_id}", response_model=CageRead)
def update_cage(
    cage_id: int,
    payload: CageUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        facility_crud.update_cage(db, cage_id, payload)
        rows = facility_crud.list_cages(db)
        return next(row for row in rows if row["id"] == cage_id)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/animals", response_model=list[AnimalAdminRead])
def list_animals(
    status: str | None = Query(None),
    species_id: int | None = Query(None),
    room_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return facility_crud.list_animals(db, status=status, species_id=species_id, room_id=room_id)


@router.get("/animals/{animal_id}", response_model=AnimalAdminRead)
def get_animal(
    animal_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.get_animal(db, animal_id)
    except Exception as exc:
        _handle_errors(exc)


@router.post("/animals", response_model=AnimalAdminRead)
def create_animal(
    payload: AnimalAdminCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.create_animal(db, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.put("/animals/{animal_id}", response_model=AnimalAdminRead)
def update_animal(
    animal_id: int,
    payload: AnimalAdminUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.update_animal(db, animal_id, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.post("/animals/{animal_id}/move", response_model=AnimalAdminRead)
def move_animal(
    animal_id: int,
    payload: AnimalMoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.move_animal(db, current_user, animal_id, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.post("/animals/{animal_id}/release-quarantine", response_model=AnimalAdminRead)
def release_quarantine(
    animal_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.release_from_quarantine(db, animal_id)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/animals/{animal_id}/weights", response_model=list[AnimalWeightRead])
def list_weights(
    animal_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.list_animal_weights(db, animal_id)
    except Exception as exc:
        _handle_errors(exc)


@router.post("/animals/{animal_id}/weights", response_model=AnimalWeightRead)
def add_weight(
    animal_id: int,
    payload: AnimalWeightCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.add_animal_weight(db, animal_id, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/procurements", response_model=list[ProcurementRead])
def list_procurements(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return facility_crud.list_procurements(db)


@router.post("/procurements", response_model=ProcurementRead)
def create_procurement(
    payload: ProcurementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.create_procurement(db, current_user, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/breeding", response_model=list[BreedingRecordRead])
def list_breeding_records(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return facility_crud.list_breeding_records(db)


@router.post("/breeding", response_model=BreedingRecordRead)
def create_breeding_record(
    payload: BreedingRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.create_breeding_record(db, current_user, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.post("/outcomes", response_model=AnimalOutcomeRead)
def record_outcome(
    payload: AnimalOutcomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.record_animal_outcome(db, current_user, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/care-logs", response_model=list[FacilityCareLogRead])
def list_care_logs(
    log_type: str | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return facility_crud.list_care_logs(db, log_type=log_type)


@router.post("/care-logs", response_model=FacilityCareLogRead)
def create_care_log(
    payload: FacilityCareLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.create_care_log(db, current_user, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/dashboard/pi", response_model=PiDashboardRead)
def read_pi_dashboard(
    protocol_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return dashboard_crud.get_pi_dashboard(db, protocol_id=protocol_id)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/dashboard/rooms", response_model=RoomDashboardRead)
def read_room_dashboard(
    stale_days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return dashboard_crud.get_room_dashboard(db, stale_days=stale_days)


@router.get("/dashboard/strains", response_model=StrainDashboardRead)
def read_strain_dashboard(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return dashboard_crud.get_strain_dashboard(db)


@router.get("/cage-map", response_model=list[CageMapRoomRead])
def read_cage_map(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return facility_crud.get_cage_map(db)


@router.get("/animals/{animal_id}/timeline", response_model=list[AnimalTimelineEventRead])
def read_animal_timeline(
    animal_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.get_animal_timeline(db, animal_id)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/labels/groups/{group_id}/cages/download")
def download_group_cage_labels(
    group_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        pdf_bytes = cage_label_crud.render_group_cage_labels_pdf(db, group_id)
    except Exception as exc:
        _handle_errors(exc)
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
    _current_user: User = Depends(require_admin),
):
    try:
        pdf_bytes = cage_label_crud.render_bulk_cage_labels_pdf(db, category, room_id=room_id)
    except Exception as exc:
        _handle_errors(exc)
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
    _current_user: User = Depends(require_admin),
):
    try:
        return cage_label_crud.build_cage_label_context(db, cage_id)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/cages/{cage_id}/label/download")
def download_cage_label(
    cage_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        pdf_bytes = cage_label_crud.render_cage_label_pdf(db, cage_id)
        context = cage_label_crud.build_cage_label_context(db, cage_id)
    except Exception as exc:
        _handle_errors(exc)
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
    _current_user: User = Depends(require_admin),
):
    try:
        return facility_crud.get_animal_label_data(db, animal_id)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/animals/{animal_id}/label/download")
def download_animal_label(
    animal_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        pdf_bytes = facility_crud.render_animal_label_pdf(db, animal_id)
        label = facility_crud.get_animal_label_data(db, animal_id)
    except Exception as exc:
        _handle_errors(exc)
    filename = f"label_{label['animal_number'].replace('/', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/supplies/items", response_model=list[SupplyItemRead])
def list_supply_items(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return supply_crud.list_supply_items(db, include_inactive=include_inactive)


@router.post("/supplies/items", response_model=SupplyItemRead)
def create_supply_item(
    payload: SupplyItemCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return supply_crud.create_supply_item(db, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.put("/supplies/items/{item_id}", response_model=SupplyItemRead)
def update_supply_item(
    item_id: int,
    payload: SupplyItemUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    try:
        return supply_crud.update_supply_item(db, item_id, payload)
    except Exception as exc:
        _handle_errors(exc)


@router.get("/supplies/transactions", response_model=list[SupplyTransactionRead])
def list_supply_transactions(
    item_id: int | None = Query(None),
    txn_type: str | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return supply_crud.list_supply_transactions(db, item_id=item_id, txn_type=txn_type)


@router.post("/supplies/transactions", response_model=SupplyTransactionRead)
def record_supply_transaction(
    payload: SupplyTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return supply_crud.record_supply_transaction(db, current_user, payload)
    except Exception as exc:
        _handle_errors(exc)
