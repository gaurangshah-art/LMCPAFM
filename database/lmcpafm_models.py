# database/lmcpafm_models.py
from datetime import date, datetime, timezone
from sqlalchemy import (
    Integer, String, Date, DateTime, ForeignKey, Table, Column, Text, Boolean, CheckConstraint, UniqueConstraint
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

class Cage(Base):
    __tablename__ = "cage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String, unique=True)
    location: Mapped[str] = mapped_column(String)

    animals: Mapped[list["Animal"]] = relationship(back_populates="cage")


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

    species: Mapped["Species"] = relationship()
    strain: Mapped["Strain"] = relationship()


# =========================================================
# ANIMAL TABLES (Base)
# =========================================================

class Animal(Base):
    __tablename__ = "animal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    species_id: Mapped[int] = mapped_column(ForeignKey("species.id"), nullable=False)
    strain_id: Mapped[int] = mapped_column(ForeignKey("strain.id"), nullable=False)
    cage_id: Mapped[int] = mapped_column(ForeignKey("cage.id"), nullable=True)
    # Lifecycle / protocol fields used by CRUD modules
    status: Mapped[str] = mapped_column(String, nullable=True)
    protocol_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"), nullable=True)

    species: Mapped["Species"] = relationship(back_populates="animals")
    strain: Mapped["Strain"] = relationship(back_populates="animals")
    cage: Mapped["Cage"] = relationship(back_populates="animals")

    weights: Mapped[list["AnimalWeight"]] = relationship(back_populates="animal")
    movements: Mapped[list["AnimalMovement"]] = relationship(back_populates="animal")
    protocol: Mapped["IAECProject"] = relationship(back_populates="animals")
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
    from_cage_id: Mapped[int] = mapped_column(ForeignKey("cage.id"))
    to_cage_id: Mapped[int] = mapped_column(ForeignKey("cage.id"))
    date: Mapped[DateTime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

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

    project: Mapped["IAECProject"] = relationship(back_populates="experiment_groups")
    experiments: Mapped[list["AnimalExperiment"]] = relationship(back_populates="group")


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


# =========================================================
# FORM B / FORM D TABLES (Base)
# =========================================================

class FormB(Base):
    __tablename__ = "form_b"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"))
    meeting_id: Mapped[int | None] = mapped_column(ForeignKey("iaec_meeting.id"), nullable=True)
    date: Mapped[Date] = mapped_column(Date)

    project: Mapped["IAECProject"] = relationship()
    meeting: Mapped["IAECMeeting | None"] = relationship()
    animal_requirements: Mapped[list["FormBAnimalRequirement"]] = relationship(back_populates="form_b")
    drug_injections: Mapped[list["FormBDrugInjection"]] = relationship(back_populates="form_b")
    investigators: Mapped[list["FormBInvestigator"]] = relationship(back_populates="form_b")
    meeting_decisions: Mapped[list["FormBMeetingDecision"]] = relationship(back_populates="form_b")


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
    role: Mapped[str] = mapped_column(String)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
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
