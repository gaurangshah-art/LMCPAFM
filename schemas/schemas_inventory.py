from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class FormCStockRow(BaseModel):
    date: date
    number_in_stock: int
    species_id: int
    species_name: str
    strain_id: int
    strain_name: str
    sex: Optional[str] = None
    age: Optional[str] = None
    voucher_or_bill_number: Optional[str] = None


class FormCAcquisitionRow(BaseModel):
    date: date
    number_acquired: int
    supplier_name: Optional[str] = None
    supplier_address: Optional[str] = None
    acquired_from: Optional[str] = None
    species_id: int
    species_name: str
    strain_id: int
    strain_name: str
    sex: Optional[str] = None
    age: Optional[str] = None
    voucher_or_bill_number: Optional[str] = None
    procurement_id: int


class FormCSuppliedRow(BaseModel):
    date: date
    number_supplied: int
    destination_name: Optional[str] = None
    destination_address: Optional[str] = None
    destination_registration_number: Optional[str] = None
    species_id: int
    species_name: str
    strain_id: int
    strain_name: str
    sex: Optional[str] = None
    age: Optional[str] = None
    allocation_id: int


class FormCBreedingRow(BaseModel):
    date: date
    number_born: int
    litter_count: int
    species_id: int
    species_name: str
    strain_id: int
    strain_name: str
    breeding_record_id: int
    remarks: Optional[str] = None


class FormCDisposalRow(BaseModel):
    date: date
    animal_id: int
    animal_number: Optional[str] = None
    method: str
    reason: str
    species_id: int
    species_name: str
    strain_id: int
    strain_name: str
    disposal_id: int


class FormCData(BaseModel):
    as_of_date: date
    stock_rows: List[FormCStockRow]
    acquisition_rows: List[FormCAcquisitionRow]
    breeding_rows: List[FormCBreedingRow] = []
    disposal_rows: List[FormCDisposalRow] = []
    supplied_rows: List[FormCSuppliedRow]
