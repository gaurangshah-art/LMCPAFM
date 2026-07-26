from datetime import date
from enum import Enum
from typing import Optional
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


class FormBRecordRead(BaseModel):
    id: int
    project_id: int
    date: date
    meeting_id: Optional[int] = None
    protocol_number: Optional[str] = None

    class Config:
        orm_mode = True


class FormBMeetingAssign(BaseModel):
    meeting_id: Optional[int] = None


class FormBProtocolRead(BaseModel):
    id: int
    project_id: int
    date: date
    meeting_id: Optional[int] = None
    protocol_number: str

    class Config:
        orm_mode = True


class FormBWithMeetingRead(BaseModel):
    form_b_id: int
    project_id: int
    project_title: str
    form_b_date: date
    meeting_id: Optional[int] = None
    meeting_date: Optional[date] = None
    meeting_number: Optional[str] = None
    protocol_number: Optional[str] = None
    decision: Optional[str] = None
    approved_animal_count: Optional[int] = None
    decision_remarks: Optional[str] = None

    class Config:
        orm_mode = True


class FormBMeetingDecisionValue(str, Enum):
    approved = "approved"
    approved_with_revisions = "approved_with_revisions"
    rejected = "rejected"
    animal_count_amended = "animal_count_amended"


class FormBMeetingDecisionUpsert(BaseModel):
    meeting_id: int
    decision: FormBMeetingDecisionValue
    approved_animal_count: Optional[int] = None
    remarks: Optional[str] = None


class FormBMeetingDecisionRead(BaseModel):
    id: int
    form_b_id: int
    meeting_id: int
    decision: str
    approved_animal_count: Optional[int] = None
    remarks: Optional[str] = None

    class Config:
        orm_mode = True


class FormBAnimalRequirementSummary(BaseModel):
    species_id: int
    species_name: str
    strain_id: int
    strain_name: str
    count: int


class FormBMeetingSummaryRead(BaseModel):
    form_b_id: int
    project_id: int
    project_title: str
    investigator_name: str
    meeting_id: int
    meeting_date: date
    meeting_number: Optional[str] = None
    protocol_number: Optional[str] = None
    decision: Optional[str] = None
    approved_animal_count: Optional[int] = None
    decision_remarks: Optional[str] = None
    animal_requirements: list[FormBAnimalRequirementSummary] = []


class FormBMeetingCertificateRead(BaseModel):
    form_b_id: int
    project_id: int
    project_title: str
    investigator_name: str
    meeting_id: int
    meeting_date: date
    meeting_number: Optional[str] = None
    protocol_number: Optional[str] = None
    decision: str
    approved_animal_count: Optional[int] = None
    decision_remarks: Optional[str] = None
    animal_requirements: list[FormBAnimalRequirementSummary] = []


class FormBInvestigatorCreate(BaseModel):
    form_b_id: int
    name: str = Field(..., max_length=200)
    role: str = Field(..., max_length=200)
    user_id: Optional[int] = None
    investigator_type: Optional[str] = Field(None, max_length=100)
    can_view_status: bool = False
    can_view_approval_letters: bool = False
    can_edit_forms: bool = False
    can_submit_form_b: bool = False


class FormBInvestigatorRead(BaseModel):
    id: int
    form_b_id: int
    name: str
    role: str
    user_id: Optional[int] = None
    investigator_type: Optional[str] = None
    can_view_status: bool
    can_view_approval_letters: bool
    can_edit_forms: bool
    can_submit_form_b: bool

    class Config:
        orm_mode = True