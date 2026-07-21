from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

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
    allocations: list["AnimalAllocationItem"] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


# Client payload (no requester spoofing)
class AnimalRequisitionCreate(BaseModel):
    protocol_id: int
    date: date
    purpose: str
    items: list[AnimalRequisitionItemCreate]


# Internal payload used by router/crud after auth binding
class AnimalRequisitionCreateInternal(AnimalRequisitionCreate):
    requester_user_id: int
    requester_name: str
    requester_role: str


class AnimalRequisition(BaseModel):
    id: int
    protocol_id: int
    requester_user_id: int
    requester_name: str
    requester_role: str
    date: date
    purpose: str
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
    animals: list[AnimalAllocationAnimal] = Field(default_factory=list)
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