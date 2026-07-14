from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from datetime import date, datetime

# =========================================================
# REQUISITION SCHEMAS
# =========================================================

class AnimalRequisitionItemBase(BaseModel):
    species_id: int
    strain_id: int
    requested_count: int

class AnimalRequisitionItemCreate(AnimalRequisitionItemBase):
    pass

class AnimalRequisitionItem(AnimalRequisitionItemBase):
    id: int
    requisition_id: int
    allocations: list[AnimalAllocationItem] = []
    model_config = ConfigDict(from_attributes=True)


class AnimalRequisitionBase(BaseModel):
    protocol_id: int
    requester_name: str
    requester_role: str
    date: date
    purpose: str

class AnimalRequisitionCreate(AnimalRequisitionBase):
    items: list[AnimalRequisitionItemCreate]

class AnimalRequisition(AnimalRequisitionBase):
    id: int
    items: list[AnimalRequisitionItem]
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# ALLOCATION SCHEMAS
# =========================================================

class AnimalAllocationItemBase(BaseModel):
    requisition_item_id: int
    allocated_count: int
    remaining_count: int

class AnimalAllocationItemCreate(AnimalAllocationItemBase):
    pass

class AnimalAllocationAnimal(BaseModel):
    id: int
    species_id: int
    strain_id: int
    cage_id: int | None = None
    status: str | None = None
    protocol_id: int | None = None
    model_config = ConfigDict(from_attributes=True)


class AnimalAllocationItem(AnimalAllocationItemBase):
    id: int
    allocation_id: int
    requisition_item_id: int
    timestamp: datetime
    animals: list[AnimalAllocationAnimal] = []
    model_config = ConfigDict(from_attributes=True)


class AnimalAllocationBase(BaseModel):
    requisition_id: int
    date: date
    allocated_by: str
    remarks: str

class AnimalAllocationCreate(AnimalAllocationBase):
    items: list[AnimalAllocationItemCreate]

class AnimalAllocation(AnimalAllocationBase):
    id: int
    items: list[AnimalAllocationItem]
    model_config = ConfigDict(from_attributes=True)