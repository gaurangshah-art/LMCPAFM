from datetime import date
from pydantic import BaseModel, ConfigDict


class DisposalBase(BaseModel):
    animal_id: int
    experiment_id: int | None = None
    date: date
    method: str
    reason: str
    remarks: str


class DisposalCreate(DisposalBase):
    pass


class Disposal(DisposalBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
