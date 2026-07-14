from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password_hash: str
    role: Literal["investigator", "iaec", "staff"]
    status: bool = True


class UserRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Literal["investigator", "iaec", "staff"]
    status: bool

    model_config = ConfigDict(from_attributes=True)
