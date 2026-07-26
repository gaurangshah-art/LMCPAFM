# schemas/iaec.py

from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from datetime import date

class IAECProjectBase(BaseModel):
    title: str
    investigator_name: str
    protocol_number: str | None = None
    approval_date: date | None = None
    principal_investigator: str | None = None
    purpose: str | None = None
    status: str | None = None
    objective: str | None = None
    start_date: date | None = None

class IAECProjectCreate(IAECProjectBase):
    pass

class IAECProject(IAECProjectBase):
    id: int
    experiment_groups: list[ExperimentGroup] = []
    model_config = ConfigDict(from_attributes=True)


class ExperimentGroupBase(BaseModel):
    name: str

class ExperimentGroupCreate(ExperimentGroupBase):
    project_id: int

class ExperimentGroup(ExperimentGroupBase):
    id: int
    project_id: int
    experiments: list[AnimalExperiment] = []
    model_config = ConfigDict(from_attributes=True)


class AnimalExperimentBase(BaseModel):
    description: str

class AnimalExperimentCreate(AnimalExperimentBase):
    group_id: int

class AnimalExperiment(AnimalExperimentBase):
    id: int
    group_id: int
    model_config = ConfigDict(from_attributes=True)


class IAECMeetingCreate(BaseModel):
    date: date
    meeting_number: str | None = None
    minutes: str = ""


class IAECMeetingRead(BaseModel):
    id: int
    date: date
    meeting_number: str | None = None
    minutes: str
    model_config = ConfigDict(from_attributes=True)
