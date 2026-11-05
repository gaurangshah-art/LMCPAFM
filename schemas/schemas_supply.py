from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


SUPPLY_CATEGORIES = frozenset({"food", "bedding", "cage", "ivc", "other"})
SUPPLY_TXN_TYPES = frozenset({"in", "out", "adjust"})


class SupplyItemCreate(BaseModel):
    name: str = Field(..., max_length=200)
    category: str = Field(..., max_length=50)
    unit: str = Field(default="each", max_length=30)
    reorder_level: float = Field(default=0, ge=0)
    initial_quantity: float = Field(default=0, ge=0)
    notes: str | None = None


class SupplyItemUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    category: str | None = Field(default=None, max_length=50)
    unit: str | None = Field(default=None, max_length=30)
    reorder_level: float | None = Field(default=None, ge=0)
    active: bool | None = None
    notes: str | None = None


class SupplyItemRead(BaseModel):
    id: int
    name: str
    category: str
    unit: str
    reorder_level: float
    quantity_on_hand: float
    active: bool
    notes: str | None = None
    low_stock: bool
    model_config = ConfigDict(from_attributes=True)


class SupplyTransactionCreate(BaseModel):
    item_id: int
    txn_type: str = Field(..., max_length=20)
    quantity: float = Field(..., gt=0)
    date: date
    notes: str | None = None
    room_id: int | None = None


class SupplyStaffTransactionCreate(BaseModel):
    item_id: int
    quantity: float = Field(..., gt=0)
    date: date
    notes: str | None = None
    room_id: int | None = None


class SupplyTransactionRead(BaseModel):
    id: int
    item_id: int
    item_name: str
    item_category: str
    item_unit: str
    txn_type: str
    quantity: float
    date: date
    notes: str | None = None
    room_id: int | None = None
    room_code: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
