from datetime import date
from pydantic import BaseModel

class FormBBase(BaseModel):
    protocol_number: str
    title: str
    principal_investigator: str
    purpose: str
    approval_date: date

class FormBRead(FormBBase):
    project_id: int

    class Config:
        orm_mode = True

