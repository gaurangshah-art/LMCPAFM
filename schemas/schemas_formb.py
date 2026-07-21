from datetime import date
from pydantic import BaseModel, Field

class FormBBase(BaseModel):
    protocol_number: str = Field(..., max_length=100)
    title: str = Field(..., max_length=500)
    principal_investigator: str = Field(..., max_length=200)
    purpose: str = Field(..., max_length=1000)
    approval_date: date

class FormBCreate(FormBBase):
    pass

class FormBRead(FormBBase):
    id: int

    class Config:
        orm_mode = True
