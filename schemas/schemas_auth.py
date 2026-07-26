from typing import List

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class InvestigatorRegisterRequest(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)


class InvestigatorRegisterResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    roles: List[str]
    status: bool
