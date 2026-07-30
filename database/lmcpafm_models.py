# database/lmcpafm_models.py
from datetime import date, datetime, timezone
from sqlalchemy import (
    Integer, String, Date, DateTime, ForeignKey, Table, Column, Text, Boolean, CheckConstraint, UniqueConstraint, JSON
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# =========================================================
# SINGLE DECLARATIVE BASE FOR ALL TABLES
# =========================================================

class Base(DeclarativeBase):
    pass

# Optional alias if you like the name BaseRA
BaseRA = Base


# =========================================================
# FACILITY / CAGE / PROCUREMENT TABLES (Base)
# =========================================================

class FacilityRoom(Base):
    __tablename__ = "facility_room"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    building: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    cages: Mapped[list["Cage"]] = relationship(back_populates="room")
    care_logs: Mapped[list["FacilityCareLog"]] = relationship(back_populates="room")
    environment_logs: Mapped[list["FacilityEnvironmentLog"]] = relationship(back_populates="room")


class Cage(Base):
    __tablename__ = "cage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String, unique=True)
    location: Mapped[str] = mapped_column(String)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("facility_room.id"), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")

    animals: Mapped[list["Animal"]] = relationship(back_populates="cage")
    room: Mapped["FacilityRoom | None"] = relationship(back_populates="cages")
    care_logs: Mapped[list["FacilityCareLog"]] = relationship(back_populates="cage")


class CageLabel(Base):
    __tablename__ = "cage_label"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cage_id: Mapped[int] = mapped_column(ForeignKey("cage.id"))
    label_text: Mapped[str] = mapped_column(String)

    cage: Mapped["Cage"] = relationship()


class Species(Base):
    __tablename__ = "species"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)

    strains: Mapped[list["Strain"]] = relationship(back_populates="species")
    animals: Mapped[list["Animal"]] = relationship(back_populates="species")
    requisition_items: Mapped[list["AnimalRequisitionItem"]] = relationship(back_populates="species")


class Strain(Base):
    __tablename__ = "strain"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    species_id: Mapped[int] = mapped_column(ForeignKey("species.id"), nullable=False)
    name: Mapped[str] = mapped_column(String)

    species: Mapped["Species"] = relationship(back_populates="strains")
    animals: Mapped[list["Animal"]] = relationship(back_populates="strain")
    requisition_items: Mapped[list["AnimalRequisitionItem"]] = relationship(back_populates="strain")


class Procurement(Base):
    __tablename__ = "procurement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    species_id: Mapped[int] = mapped_column(ForeignKey("species.id"))
    strain_id: Mapped[int] = mapped_column(ForeignKey("strain.id"))
    count: Mapped[int] = mapped_column(Integer)
    date: Mapped[Date] = mapped_column(Date)
    supplier_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    supplier_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    supplier_registration_number: Mapped[str | None] = mapped_column(String(200), nullable=True)
    acquired_from: Mapped[str | None] = mapped_column(String(500), nullable=True)
    voucher_or_bill_number: Mapped[str | None] = mapped_column(String(200), nullable=True)
    received_by_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    species: Mapped["Species"] = relationship()
    strain: Mapped["Strain"] = relationship()
    animals: Mapped[list["Animal"]] = relationship(back_populates="procurement")


class BreedingRecord(Base):
    __tablename__ = "breeding_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    species_id: Mapped[int] = mapped_column(ForeignKey("species.id"), nullable=False)
    strain_id: Mapped[int] = mapped_column(ForeignKey("strain.id"), nullable=False)
    sire_animal_id: Mapped[int | None] = mapped_column(ForeignKey("animal.id"), nullable=True)
    dam_animal_id: Mapped[int | None] = mapped_column(ForeignKey("animal.id"), nullable=True)
    litter_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    offspring_count: Mapped[int] = mapped_column(Integer, nullable=False)
    offspring_male_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    offspring_female_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cage_id: Mapped[int | None] = mapped_column(ForeignKey("cage.id"), nullable=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("facility_room.id"), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    species: Mapped["Species"] = relationship(foreign_keys=[species_id])
    strain: Mapped["Strain"] = relationship(foreign_keys=[strain_id])
    cage: Mapped["Cage | None"] = relationship(foreign_keys=[cage_id])
    room: Mapped["FacilityRoom | None"] = relationship(foreign_keys=[room_id])
    animals: Mapped[list["Animal"]] = relationship(
        back_populates="breeding_record",
        foreign_keys="Animal.breeding_record_id",
    )


class FacilityCareLog(Base):
    __tablename__ = "facility_care_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    log_type: Mapped[str] = mapped_column(String(50), nullable=False)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("facility_room.id"), nullable=True)
    cage_id: Mapped[int | None] = mapped_column(ForeignKey("cage.id"), nullable=True)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    performed_by_name: Mapped[str] = mapped_column(String(200), nullable=False)
    recorded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    room: Mapped["FacilityRoom | None"] = relationship(back_populates="care_logs")
    cage: Mapped["Cage | None"] = relationship(back_populates="care_logs")


class SupplyItem(Base):
    __tablename__ = "supply_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False, default="each")
    reorder_level: Mapped[float] = mapped_column(nullable=False, default=0)
    quantity_on_hand: Mapped[float] = mapped_column(nullable=False, default=0)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    transactions: Mapped[list["SupplyTransaction"]] = relationship(back_populates="item")

    __table_args__ = (UniqueConstraint("name", "category", name="uq_supply_item_name_category"),)


class SupplyTransaction(Base):
    __tablename__ = "supply_transaction"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("supply_item.id"), nullable=False)
    txn_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[float] = mapped_column(nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("facility_room.id"), nullable=True)
    recorded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    item: Mapped["SupplyItem"] = relationship(back_populates="transactions")
    room: Mapped["FacilityRoom | None"] = relationship()


class FacilityEnvironmentLog(Base):
    __tablename__ = "facility_environment_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("facility_room.id"), nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    temperature_c: Mapped[float | None] = mapped_column(nullable=True)
    humidity_pct: Mapped[float | None] = mapped_column(nullable=True)
    hvac_status: Mapped[str] = mapped_column(String(50), nullable=False, default="normal")
    light_cycle: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by_name: Mapped[str] = mapped_column(String(200), nullable=False)
    recorded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    room: Mapped["FacilityRoom"] = relationship(back_populates="environment_logs")


# =========================================================
# ANIMAL TABLES (Base)
# =========================================================

class Animal(Base):
    __tablename__ = "animal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    animal_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    species_id: Mapped[int] = mapped_column(ForeignKey("species.id"), nullable=False)
    strain_id: Mapped[int] = mapped_column(ForeignKey("strain.id"), nullable=False)
    cage_id: Mapped[int | None] = mapped_column(ForeignKey("cage.id"), nullable=True)
    sex: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[Date | None] = mapped_column(Date, nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    procurement_id: Mapped[int | None] = mapped_column(ForeignKey("procurement.id"), nullable=True)
    breeding_record_id: Mapped[int | None] = mapped_column(ForeignKey("breeding_record.id"), nullable=True)
    quarantine_start_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    quarantine_end_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    rehabilitation_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Lifecycle / protocol fields used by CRUD modules
    status: Mapped[str] = mapped_column(String, nullable=True)
    protocol_id: Mapped[int | None] = mapped_column(ForeignKey("iaec_project.id"), nullable=True)
    experiment_group_id: Mapped[int | None] = mapped_column(
        ForeignKey("experiment_group.id"), nullable=True
    )

    species: Mapped["Species"] = relationship(back_populates="animals")
    strain: Mapped["Strain"] = relationship(back_populates="animals")
    cage: Mapped["Cage | None"] = relationship(back_populates="animals")
    procurement: Mapped["Procurement | None"] = relationship(back_populates="animals")
    breeding_record: Mapped["BreedingRecord | None"] = relationship(
        back_populates="animals",
        foreign_keys=[breeding_record_id],
    )

    weights: Mapped[list["AnimalWeight"]] = relationship(back_populates="animal")
    movements: Mapped[list["AnimalMovement"]] = relationship(back_populates="animal")
    protocol: Mapped["IAECProject | None"] = relationship(back_populates="animals")
    experiment_group: Mapped["ExperimentGroup | None"] = relationship(back_populates="animals")
    experiments: Mapped[list["ExperimentAnimal"]] = relationship(back_populates="animal")
    allocation_items: Mapped[list["AnimalAllocationItem"]] = relationship(
        secondary="allocation_item_animals",
        back_populates="animals",
    )


class AnimalWeight(Base):
    __tablename__ = "animal_weight"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"))
    date: Mapped[Date] = mapped_column(Date)
    weight_g: Mapped[int] = mapped_column(Integer)

    animal: Mapped["Animal"] = relationship(back_populates="weights")


class AnimalMovement(Base):
    __tablename__ = "animal_movement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"))
    from_cage_id: Mapped[int | None] = mapped_column(ForeignKey("cage.id"), nullable=True)
    to_cage_id: Mapped[int | None] = mapped_column(ForeignKey("cage.id"), nullable=True)
    from_room_id: Mapped[int | None] = mapped_column(ForeignKey("facility_room.id"), nullable=True)
    to_room_id: Mapped[int | None] = mapped_column(ForeignKey("facility_room.id"), nullable=True)
    date: Mapped[DateTime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    recorded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    animal: Mapped["Animal"] = relationship(back_populates="movements")


# =========================================================
# IAEC PROJECT / MEETING TABLES (Base)
# =========================================================

class IAECProject(Base):
    __tablename__ = "iaec_project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    investigator_name: Mapped[str] = mapped_column(String, nullable=False)
    # Fields expected by other modules (Form-D generation, validations)
    protocol_number: Mapped[str] = mapped_column(String, nullable=True)
    approval_date: Mapped[Date] = mapped_column(Date, nullable=True)
    principal_investigator: Mapped[str] = mapped_column(String, nullable=True)
    purpose: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=True)
    # Optional fields accepted by IAEC schemas
    objective: Mapped[str] = mapped_column(String, nullable=True)
    start_date: Mapped[Date] = mapped_column(Date, nullable=True)

    experiment_groups: Mapped[list["ExperimentGroup"]] = relationship(back_populates="project")
    animals: Mapped[list["Animal"]] = relationship(back_populates="protocol")
    requisitions: Mapped[list["AnimalRequisition"]] = relationship(back_populates="protocol")
    experiments: Mapped[list["Experiment"]] = relationship(back_populates="protocol")


class ExperimentGroup(Base):
    __tablename__ = "experiment_group"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    planned_animal_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    form_b_study_group_id: Mapped[int | None] = mapped_column(
        ForeignKey("form_b_study_group.id"), nullable=True
    )

    project: Mapped["IAECProject"] = relationship(back_populates="experiment_groups")
    experiments: Mapped[list["AnimalExperiment"]] = relationship(back_populates="group")
    animals: Mapped[list["Animal"]] = relationship(back_populates="experiment_group")
    form_b_study_group: Mapped["FormBStudyGroup | None"] = relationship(
        back_populates="experiment_groups"
    )


class AnimalExperiment(Base):
    __tablename__ = "animal_experiment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("experiment_group.id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    group: Mapped["ExperimentGroup"] = relationship(back_populates="experiments")


class IAECAgenda(Base):
    __tablename__ = "iaec_agenda"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_date: Mapped[Date] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(Text)


class IAECMeeting(Base):
    __tablename__ = "iaec_meeting"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[Date] = mapped_column(Date)
    meeting_number: Mapped[str | None] = mapped_column(String, nullable=True)
    minutes: Mapped[str] = mapped_column(Text)


class IAECMinutes(Base):
    __tablename__ = "iaec_minutes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("iaec_meeting.id"))
    content: Mapped[str] = mapped_column(Text)


class IAECAmendment(Base):
    __tablename__ = "iaec_amendment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"))
    description: Mapped[str] = mapped_column(Text)


class IAECRenewal(Base):
    __tablename__ = "iaec_renewal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"))
    date: Mapped[Date] = mapped_column(Date)


class IAECProjectClosure(Base):
    __tablename__ = "iaec_project_closure"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"))
    date: Mapped[Date] = mapped_column(Date)
    remarks: Mapped[str] = mapped_column(Text)


class ProjectSignedCertificate(Base):
    __tablename__ = "project_signed_certificate"
    __table_args__ = (
        UniqueConstraint("project_id", name="uq_project_signed_certificate_project"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(200), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    project: Mapped["IAECProject"] = relationship()


# =========================================================
# FORM B / FORM D TABLES (Base)
# =========================================================

class FormB(Base):
    __tablename__ = "form_b"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"))
    meeting_id: Mapped[int | None] = mapped_column(ForeignKey("iaec_meeting.id"), nullable=True)
    date: Mapped[Date] = mapped_column(Date)
    application_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["IAECProject"] = relationship()
    meeting: Mapped["IAECMeeting | None"] = relationship()
    animal_requirements: Mapped[list["FormBAnimalRequirement"]] = relationship(back_populates="form_b")
    drug_injections: Mapped[list["FormBDrugInjection"]] = relationship(back_populates="form_b")
    investigators: Mapped[list["FormBInvestigator"]] = relationship(back_populates="form_b")
    meeting_decisions: Mapped[list["FormBMeetingDecision"]] = relationship(back_populates="form_b")
    attachments: Mapped[list["FormBAttachment"]] = relationship(back_populates="form_b")
    study_phases: Mapped[list["FormBStudyPhase"]] = relationship(
        back_populates="form_b",
        cascade="all, delete-orphan",
        order_by="FormBStudyPhase.sequence_order",
    )


class FormBStudyPhase(Base):
    __tablename__ = "form_b_study_phase"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_b_id: Mapped[int] = mapped_column(ForeignKey("form_b.id"), nullable=False)
    phase_code: Mapped[str] = mapped_column(String(50), nullable=False, default="main")
    phase_name: Mapped[str] = mapped_column(String(200), nullable=False)
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    planned_start_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    planned_duration_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    animal_cap: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    contingency_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    depends_on_phase_id: Mapped[int | None] = mapped_column(
        ForeignKey("form_b_study_phase.id"), nullable=True
    )
    reuse_animals_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    form_b: Mapped["FormB"] = relationship(back_populates="study_phases")
    depends_on_phase: Mapped["FormBStudyPhase | None"] = relationship(
        remote_side="FormBStudyPhase.id",
    )
    groups: Mapped[list["FormBStudyGroup"]] = relationship(
        back_populates="phase",
        cascade="all, delete-orphan",
        order_by="FormBStudyGroup.id",
    )


class FormBStudyGroup(Base):
    __tablename__ = "form_b_study_group"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phase_id: Mapped[int] = mapped_column(ForeignKey("form_b_study_phase.id"), nullable=False)
    group_code: Mapped[str] = mapped_column(String(50), nullable=False)
    group_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="other")
    animal_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    species_id: Mapped[int | None] = mapped_column(ForeignKey("species.id"), nullable=True)
    strain_id: Mapped[int | None] = mapped_column(ForeignKey("strain.id"), nullable=True)
    sex: Mapped[str | None] = mapped_column(String(50), nullable=True)
    age: Mapped[str | None] = mapped_column(String(100), nullable=True)
    weight_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    feeding_diet: Mapped[str | None] = mapped_column(String(200), nullable=True)
    housing_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    treatment_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    phase: Mapped["FormBStudyPhase"] = relationship(back_populates="groups")
    species: Mapped["Species | None"] = relationship()
    strain: Mapped["Strain | None"] = relationship()
    dosing_entries: Mapped[list["FormBGroupDosing"]] = relationship(
        back_populates="study_group",
        cascade="all, delete-orphan",
        order_by="FormBGroupDosing.id",
    )
    endpoints: Mapped[list["FormBGroupEndpoint"]] = relationship(
        back_populates="study_group",
        cascade="all, delete-orphan",
        order_by="FormBGroupEndpoint.id",
    )
    fates: Mapped[list["FormBGroupFate"]] = relationship(
        back_populates="study_group",
        cascade="all, delete-orphan",
        order_by="FormBGroupFate.id",
    )
    experiment_groups: Mapped[list["ExperimentGroup"]] = relationship(
        back_populates="form_b_study_group"
    )


class FormBGroupDosing(Base):
    __tablename__ = "form_b_group_dosing"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    study_group_id: Mapped[int] = mapped_column(ForeignKey("form_b_study_group.id"), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dose: Mapped[str] = mapped_column(String(200), nullable=False)
    route: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    frequency: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    start_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    volume: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    study_group: Mapped["FormBStudyGroup"] = relationship(back_populates="dosing_entries")


class FormBGroupEndpoint(Base):
    __tablename__ = "form_b_group_endpoint"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    study_group_id: Mapped[int] = mapped_column(ForeignKey("form_b_study_group.id"), nullable=False)
    parameter_code: Mapped[str] = mapped_column(String(100), nullable=False)
    parameter_name: Mapped[str] = mapped_column(String(200), nullable=False)
    schedule_type: Mapped[str] = mapped_column(String(50), nullable=False, default="single")
    schedule_detail: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    method: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    study_group: Mapped["FormBStudyGroup"] = relationship(back_populates="endpoints")


class FormBGroupFate(Base):
    __tablename__ = "form_b_group_fate"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    study_group_id: Mapped[int] = mapped_column(ForeignKey("form_b_study_group.id"), nullable=False)
    fate_type: Mapped[str] = mapped_column(String(50), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    method_or_destination: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timing: Mapped[str | None] = mapped_column(String(200), nullable=True)

    study_group: Mapped["FormBStudyGroup"] = relationship(back_populates="fates")


class FormBAttachment(Base):
    __tablename__ = "form_b_attachment"
    __table_args__ = (
        UniqueConstraint("form_b_id", "category", name="uq_form_b_attachment_category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_b_id: Mapped[int] = mapped_column(ForeignKey("form_b.id"))
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(200), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    form_b: Mapped["FormB"] = relationship(back_populates="attachments")


class FormBMeetingDecision(Base):
    __tablename__ = "form_b_meeting_decision"
    __table_args__ = (
        UniqueConstraint("form_b_id", "meeting_id", name="uq_form_b_meeting_decision"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_b_id: Mapped[int] = mapped_column(ForeignKey("form_b.id"))
    meeting_id: Mapped[int] = mapped_column(ForeignKey("iaec_meeting.id"))
    decision: Mapped[str] = mapped_column(String, nullable=False)
    approved_animal_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    form_b: Mapped["FormB"] = relationship(back_populates="meeting_decisions")
    meeting: Mapped["IAECMeeting"] = relationship()


class FormBAnimalRequirement(Base):
    __tablename__ = "form_b_animal_requirement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_b_id: Mapped[int] = mapped_column(ForeignKey("form_b.id"))
    species_id: Mapped[int] = mapped_column(ForeignKey("species.id"))
    strain_id: Mapped[int] = mapped_column(ForeignKey("strain.id"))
    count: Mapped[int] = mapped_column(Integer)

    form_b: Mapped["FormB"] = relationship(back_populates="animal_requirements")
    species: Mapped["Species"] = relationship()
    strain: Mapped["Strain"] = relationship()


class FormBDrugInjection(Base):
    __tablename__ = "form_b_drug_injection"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_b_id: Mapped[int] = mapped_column(ForeignKey("form_b.id"))
    drug_name: Mapped[str] = mapped_column(String)
    dose: Mapped[str] = mapped_column(String)

    form_b: Mapped["FormB"] = relationship(back_populates="drug_injections")


class FormBInvestigator(Base):
    __tablename__ = "form_b_investigator"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_b_id: Mapped[int] = mapped_column(ForeignKey("form_b.id"))
    name: Mapped[str] = mapped_column(String)
    project_role: Mapped[str] = mapped_column(String)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    investigator_profile_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("investigator_profile.user_id"),
        nullable=True,
    )
    investigator_type: Mapped[str | None] = mapped_column(String, nullable=True)
    can_view_status: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_view_approval_letters: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_edit_forms: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_submit_form_b: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    form_b: Mapped["FormB"] = relationship(back_populates="investigators")


class FormDRecord(Base):
    __tablename__ = "form_d_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"))
    date: Mapped[Date] = mapped_column(Date)

    project: Mapped["IAECProject"] = relationship()
    usages: Mapped[list["FormDAnimalUsage"]] = relationship(back_populates="record")


class FormDAnimalUsage(Base):
    __tablename__ = "form_d_animal_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("form_d_record.id"))
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"))
    procedure: Mapped[str] = mapped_column(String)

    record: Mapped["FormDRecord"] = relationship(back_populates="usages")
    animal: Mapped["Animal"] = relationship()
