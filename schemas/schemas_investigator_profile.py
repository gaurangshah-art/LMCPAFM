from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class InvestigatorProfileUpdate(BaseModel):
    institutional_email: Optional[str] = Field(None, max_length=255)
    institution_name: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=255)
    designation: Optional[str] = Field(None, max_length=255)
    age: Optional[int] = Field(None, ge=18, le=120)
    qualification: Optional[str] = Field(None, max_length=255)
    years_experience: Optional[int] = Field(None, ge=0, le=80)
    animal_handling_experience: Optional[str] = Field(None, max_length=5000)
    is_lmcp_faculty: Optional[bool] = None


class InvestigatorProfileRead(BaseModel):
    user_id: int
    institutional_email: Optional[str] = None
    institution_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    age: Optional[int] = None
    qualification: Optional[str] = None
    years_experience: Optional[int] = None
    animal_handling_experience: Optional[str] = None
    is_lmcp_faculty: bool
    is_complete: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
