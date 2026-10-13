from pydantic import BaseModel, Field


class SpeciesCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class SpeciesRead(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class StrainCreate(BaseModel):
    species_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=200)


class StrainRead(BaseModel):
    id: int
    species_id: int
    name: str
    species_name: str | None = None

    class Config:
        from_attributes = True
