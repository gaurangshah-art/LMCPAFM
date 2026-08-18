from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class FacilityRoomCreate(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    building: str | None = Field(None, max_length=200)
    notes: str | None = None


class FacilityRoomUpdate(BaseModel):
    code: str | None = Field(None, max_length=50)
    name: str | None = Field(None, max_length=200)
    building: str | None = Field(None, max_length=200)
    notes: str | None = None


class FacilityRoomRead(FacilityRoomCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CageCreate(BaseModel):
    label: str = Field(..., max_length=100)
    location: str = Field(..., max_length=200)
    room_id: int | None = None
    capacity: int = Field(1, ge=1)
    status: str = Field("active", max_length=50)


class CageUpdate(BaseModel):
    label: str | None = Field(None, max_length=100)
    location: str | None = Field(None, max_length=200)
    room_id: int | None = None
    capacity: int | None = Field(None, ge=1)
    status: str | None = Field(None, max_length=50)


class CageRead(CageCreate):
    id: int
    room_code: str | None = None
    room_name: str | None = None
    animal_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class AnimalAdminCreate(BaseModel):
    species_id: int
    strain_id: int
    animal_number: str | None = Field(None, max_length=100)
    sex: str | None = Field(None, max_length=20)
    date_of_birth: date | None = None
    cage_id: int | None = None
    status: str = Field("available", max_length=50)
    source_type: str | None = Field(None, max_length=50)
    notes: str | None = None
    start_quarantine: bool = False
    quarantine_start_date: date | None = None


class AnimalAdminUpdate(BaseModel):
    animal_number: str | None = Field(None, max_length=100)
    sex: str | None = Field(None, max_length=20)
    date_of_birth: date | None = None
    cage_id: int | None = None
    status: str | None = Field(None, max_length=50)
    notes: str | None = None
    quarantine_start_date: date | None = None
    quarantine_end_date: date | None = None
    rehabilitation_date: date | None = None


class AnimalAdminRead(BaseModel):
    id: int
    animal_number: str | None = None
    species_id: int
    strain_id: int
    species_name: str | None = None
    strain_name: str | None = None
    cage_id: int | None = None
    cage_label: str | None = None
    room_code: str | None = None
    sex: str | None = None
    date_of_birth: date | None = None
    source_type: str | None = None
    procurement_id: int | None = None
    breeding_record_id: int | None = None
    quarantine_start_date: date | None = None
    quarantine_end_date: date | None = None
    rehabilitation_date: date | None = None
    notes: str | None = None
    status: str | None = None
    protocol_id: int | None = None
    latest_weight_g: int | None = None
    model_config = ConfigDict(from_attributes=True)


class AnimalMoveRequest(BaseModel):
    to_cage_id: int | None = None
    to_room_id: int | None = None
    move_date: date | None = None
    reason: str | None = Field(None, max_length=500)


class AnimalWeightCreate(BaseModel):
    date: date
    weight_g: int = Field(..., gt=0)


class AnimalWeightRead(AnimalWeightCreate):
    id: int
    animal_id: int
    model_config = ConfigDict(from_attributes=True)


class ProcurementCreate(BaseModel):
    species_id: int
    strain_id: int
    count: int = Field(..., ge=1)
    date: date
    supplier_name: str | None = Field(None, max_length=500)
    supplier_address: str | None = None
    supplier_registration_number: str | None = Field(None, max_length=200)
    acquired_from: str | None = Field(None, max_length=500)
    voucher_or_bill_number: str | None = Field(None, max_length=200)
    received_by_name: str | None = Field(None, max_length=200)
    remarks: str | None = None
    create_animals: bool = True
    start_quarantine: bool = True
    quarantine_start_date: date | None = None


class ProcurementRead(BaseModel):
    id: int
    species_id: int
    strain_id: int
    species_name: str | None = None
    strain_name: str | None = None
    count: int
    date: date
    supplier_name: str | None = None
    supplier_address: str | None = None
    supplier_registration_number: str | None = None
    acquired_from: str | None = None
    voucher_or_bill_number: str | None = None
    received_by_name: str | None = None
    remarks: str | None = None
    animals_created: int = 0
    model_config = ConfigDict(from_attributes=True)


class BreedingRecordCreate(BaseModel):
    date: date
    species_id: int
    strain_id: int
    sire_animal_id: int | None = None
    dam_animal_id: int | None = None
    litter_count: int = Field(1, ge=1)
    offspring_count: int = Field(..., ge=1)
    offspring_male_count: int | None = Field(None, ge=0)
    offspring_female_count: int | None = Field(None, ge=0)
    cage_id: int | None = None
    room_id: int | None = None
    remarks: str | None = None
    create_offspring: bool = True
    start_quarantine: bool = True


class BreedingRecordRead(BaseModel):
    id: int
    date: date
    species_id: int
    strain_id: int
    species_name: str | None = None
    strain_name: str | None = None
    sire_animal_id: int | None = None
    dam_animal_id: int | None = None
    litter_count: int
    offspring_count: int
    offspring_male_count: int | None = None
    offspring_female_count: int | None = None
    cage_id: int | None = None
    room_id: int | None = None
    remarks: str | None = None
    created_at: datetime
    animals_created: int = 0
    model_config = ConfigDict(from_attributes=True)


class AnimalOutcomeCreate(BaseModel):
    animal_id: int
    date: date
    outcome_type: str = Field(..., max_length=50)
    method: str | None = Field(None, max_length=100)
    reason: str = Field(..., max_length=1000)
    remarks: str | None = None
    experiment_id: int | None = None


class AnimalOutcomeRead(BaseModel):
    id: int
    animal_id: int
    date: date
    outcome_type: str
    method: str | None = None
    reason: str
    remarks: str | None = None
    animal_status: str | None = None
    model_config = ConfigDict(from_attributes=True)


class FacilityCareLogCreate(BaseModel):
    log_type: str = Field(..., max_length=50)
    room_id: int | None = None
    cage_id: int | None = None
    date: date
    details: str
    performed_by_name: str | None = Field(default=None, max_length=200)


class FacilityCareLogRead(FacilityCareLogCreate):
    id: int
    room_code: str | None = None
    cage_label: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FacilityEnvironmentLogCreate(BaseModel):
    room_id: int
    date: date
    temperature_c: float | None = None
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    hvac_status: str = Field(default="normal", max_length=50)
    light_cycle: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    performed_by_name: str | None = Field(default=None, max_length=200)


class FacilityEnvironmentLogRead(FacilityEnvironmentLogCreate):
    id: int
    room_code: str | None = None
    room_name: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FacilitySummaryRead(BaseModel):
    total_animals: int
    available_animals: int
    quarantine_animals: int
    allocated_animals: int
    deceased_animals: int
    rehabilitated_animals: int
    total_rooms: int
    total_cages: int
    procurements_this_month: int
    breeding_records_this_month: int


class CageMapAnimalRead(BaseModel):
    id: int
    animal_number: str | None = None
    status: str | None = None
    species_name: str | None = None
    strain_name: str | None = None


class CageMapCageRead(BaseModel):
    id: int
    label: str
    location: str
    capacity: int
    status: str
    animal_count: int
    animals: list[CageMapAnimalRead] = Field(default_factory=list)


class CageMapRoomRead(BaseModel):
    id: int
    code: str
    name: str
    building: str | None = None
    cages: list[CageMapCageRead] = Field(default_factory=list)


class AnimalTimelineEventRead(BaseModel):
    event_type: str
    date: str
    title: str
    details: str | None = None


class AnimalLabelRead(BaseModel):
    animal_id: int
    animal_number: str
    species_name: str | None = None
    strain_name: str | None = None
    barcode_value: str


class CageLabelAnimalRead(BaseModel):
    id: int
    animal_number: str | None = None
    status: str | None = None


class CageLabelRead(BaseModel):
    cage_id: int
    cage_label: str
    room_code: str | None = None
    location: str
    category: str
    banner_text: str
    species_summary: str | None = None
    strain_summary: str | None = None
    subtitle: str | None = None
    barcode_value: str
    group_id: int | None = None
    group_name: str | None = None
    protocol_number: str | None = None
    animals: list[CageLabelAnimalRead] = Field(default_factory=list)


class PiDashboardGroupRead(BaseModel):
    group_id: int
    group_name: str
    animal_count: int
    caged_count: int


class PiDashboardProtocolRead(BaseModel):
    protocol_id: int
    protocol_number: str | None = None
    title: str
    principal_investigator: str | None = None
    status: str | None = None
    total_animals: int
    allocated_count: int
    in_experiment_count: int
    caged_count: int
    uncaged_count: int
    groups: list[PiDashboardGroupRead] = Field(default_factory=list)


class PiDashboardRead(BaseModel):
    protocols: list[PiDashboardProtocolRead] = Field(default_factory=list)


class RoomDashboardRowRead(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    building: str | None = None
    cage_count: int
    occupied_cages: int
    total_capacity: int
    animal_count: int
    quarantine_count: int
    available_count: int
    allocated_count: int
    rehabilitated_count: int
    last_care_date: date | None = None
    care_stale: bool


class RoomDashboardRead(BaseModel):
    stale_days: int
    rooms: list[RoomDashboardRowRead] = Field(default_factory=list)


class StrainDashboardRowRead(BaseModel):
    strain_id: int
    strain_name: str
    species_id: int
    species_name: str | None = None
    total_animals: int
    available_count: int
    quarantine_count: int
    allocated_count: int
    in_experiment_count: int
    rehabilitated_count: int
    deceased_count: int


class StrainDashboardRead(BaseModel):
    strains: list[StrainDashboardRowRead] = Field(default_factory=list)


class FacilityOperationsActivityRead(BaseModel):
    kind: str
    date: date
    title: str
    subtitle: str
    details: str


class FacilityOperationsSummaryRead(BaseModel):
    as_of_date: date
    facility_summary: FacilitySummaryRead
    stale_care_room_count: int
    stale_care_rooms: list[RoomDashboardRowRead] = Field(default_factory=list)
    low_stock_count: int
    low_stock_items: list[dict] = Field(default_factory=list)
    rooms_logged_today: int
    rooms_missing_env_today: int
    total_rooms: int
    recent_activity: list[FacilityOperationsActivityRead] = Field(default_factory=list)
