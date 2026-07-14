from datetime import date
from pydantic import BaseModel


class FormBDetails(BaseModel):
    protocol_id: int
    protocol_number: str | None = None
    title: str | None = None
    principal_investigator: str | None = None
    purpose: str | None = None
    approval_date: date | None = None
    source: str
