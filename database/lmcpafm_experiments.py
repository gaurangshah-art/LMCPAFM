from sqlalchemy import (
    Integer, String, Date, DateTime, ForeignKey, Table, Column
)
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, mapped_column, relationship
)
from datetime import datetime, timezone

# Base class for experiment module
from database.lmcpafm_models import BaseRA


# =========================================================
# ASSOCIATION TABLE (Experiment ↔ Animals)
# =========================================================

# =========================================================
# EXPERIMENT HEADER
# =========================================================

class Experiment(BaseRA):
    __tablename__ = "experiment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Link to protocol
    protocol_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"), nullable=False)

    # Link to allocation (important for Form-D)
    allocation_id: Mapped[int] = mapped_column(ForeignKey("animal_allocation.id"), nullable=False)

    experiment_group_id: Mapped[int] = mapped_column(
        ForeignKey("experiment_group.id"), nullable=False
    )

    # Human-friendly experiment date used by schemas/CRUD
    date: Mapped[Date] = mapped_column(Date, nullable=False)

    # Experiment details
    start_time: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    procedure: Mapped[str] = mapped_column(String, nullable=False)      # e.g. "Acute toxicity study"
    dose: Mapped[str] = mapped_column(String, nullable=False)           # e.g. "Drug X 10 mg/kg i.p."
    observations: Mapped[str] = mapped_column(String, nullable=False)   # brief notes
    performed_by: Mapped[str] = mapped_column(String, nullable=False)   # researcher name
    purpose: Mapped[str] = mapped_column(String, nullable=False)        # experiment purpose

    # Relationships
    protocol: Mapped["IAECProject"] = relationship(back_populates="experiments")
    allocation: Mapped["AnimalAllocation"] = relationship(back_populates="experiments")
    experiment_group: Mapped["ExperimentGroup"] = relationship()
    animals: Mapped[list["ExperimentAnimal"]] = relationship(
        back_populates="experiment"
    )


# =========================================================
# EXPERIMENT ↔ ANIMAL LINK
# =========================================================

class ExperimentAnimal(BaseRA):
    __tablename__ = "experiment_animal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    experiment_id: Mapped[int] = mapped_column(ForeignKey("experiment.id"), nullable=False)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"), nullable=False)

    experiment: Mapped["Experiment"] = relationship(back_populates="animals")
    animal: Mapped["Animal"] = relationship(back_populates="experiments")
