from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import List, Optional


class FormD(BaseModel):
    protocol_number: str
    approval_date: date
    title: str
    principal_investigator: str
    purpose: str

    allocated_count: int
    used_in_experiment: int
    disposed_count: int
    remaining_count: int

    allocations: List[dict]
    allocation_items: List[dict]
    experiments: List[dict]
    disposals: List[dict]

    model_config = ConfigDict(from_attributes=True)
