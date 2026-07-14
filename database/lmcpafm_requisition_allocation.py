# database/lmcpafm_requisition_allocation.py
from sqlalchemy import Integer, String, Date, DateTime, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone

from database.lmcpafm_models import Base, IAECProject, Species, Strain, Animal


allocation_item_animals = Table(
    "allocation_item_animals",
    Base.metadata,
    Column("allocation_item_id", Integer, ForeignKey("animal_allocation_item.id")),
    Column("animal_id", Integer, ForeignKey("animal.id")),
)


class AnimalRequisition(Base):
    __tablename__ = "animal_requisition"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    protocol_id: Mapped[int] = mapped_column(ForeignKey("iaec_project.id"), nullable=False)
    requester_name: Mapped[str] = mapped_column(String, nullable=False)
    requester_role: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    purpose: Mapped[str] = mapped_column(String, nullable=False)

    protocol: Mapped["IAECProject"] = relationship(back_populates="requisitions")
    items: Mapped[list["AnimalRequisitionItem"]] = relationship(back_populates="requisition")
    allocations: Mapped[list["AnimalAllocation"]] = relationship(back_populates="requisition")


class AnimalRequisitionItem(Base):
    __tablename__ = "animal_requisition_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requisition_id: Mapped[int] = mapped_column(ForeignKey("animal_requisition.id"), nullable=False)
    species_id: Mapped[int] = mapped_column(ForeignKey("species.id"), nullable=False)
    strain_id: Mapped[int] = mapped_column(ForeignKey("strain.id"), nullable=False)
    requested_count: Mapped[int] = mapped_column(Integer, nullable=False)

    requisition: Mapped["AnimalRequisition"] = relationship(back_populates="items")
    species: Mapped["Species"] = relationship(back_populates="requisition_items")
    strain: Mapped["Strain"] = relationship(back_populates="requisition_items")
    allocations: Mapped[list["AnimalAllocationItem"]] = relationship(back_populates="requisition_item")


class AnimalAllocation(Base):
    __tablename__ = "animal_allocation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requisition_id: Mapped[int] = mapped_column(ForeignKey("animal_requisition.id"), nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    allocated_by: Mapped[str] = mapped_column(String, nullable=False)
    remarks: Mapped[str] = mapped_column(String, nullable=False)

    requisition: Mapped["AnimalRequisition"] = relationship(back_populates="allocations")
    items: Mapped[list["AnimalAllocationItem"]] = relationship(back_populates="allocation")
    experiments: Mapped[list["Experiment"]] = relationship(back_populates="allocation")


class AnimalAllocationItem(Base):
    __tablename__ = "animal_allocation_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    allocation_id: Mapped[int] = mapped_column(ForeignKey("animal_allocation.id"), nullable=False)
    requisition_item_id: Mapped[int] = mapped_column(ForeignKey("animal_requisition_item.id"), nullable=False)
    allocated_count: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_count: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[DateTime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    allocation: Mapped["AnimalAllocation"] = relationship(back_populates="items")
    requisition_item: Mapped["AnimalRequisitionItem"] = relationship(back_populates="allocations")

    animals: Mapped[list["Animal"]] = relationship(
        "Animal",
        secondary="allocation_item_animals",
        back_populates="allocation_items",
    )
