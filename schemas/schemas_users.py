from enum import Enum
from typing import List

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    investigator = "investigator"
    iaec = "iaec"
    staff = "staff"
    admin = "admin"


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    roles: List[UserRole]
    status: bool = True


class UserRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    roles: List[str]
    status: bool

    model_config = ConfigDict(from_attributes=True)


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)