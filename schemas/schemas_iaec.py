# schemas/iaec.py

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime

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


class InvestigatorProjectSummary(BaseModel):
    id: int
    title: str
    investigator_name: str
    protocol_number: str | None = None
    approval_date: date | None = None
    principal_investigator: str | None = None
    status: str | None = None
    form_b_id: int | None = None
    meeting_id: int | None = None
    meeting_year: int | None = None
    meeting_number: str | None = None
    submitted_at: str | None = None
    experiment_group_count: int = 0
    experiment_count: int = 0


class ExperimentGroupBase(BaseModel):
    name: str
    planned_animal_count: int = Field(gt=0)


class ExperimentGroupCreate(ExperimentGroupBase):
    project_id: int


class ExperimentGroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    planned_animal_count: int | None = Field(default=None, gt=0)


class ExperimentGroup(ExperimentGroupBase):
    id: int
    project_id: int
    form_b_study_group_id: int | None = None
    experiments: list[AnimalExperiment] = []
    model_config = ConfigDict(from_attributes=True)


class ExperimentGroupResyncSkipped(BaseModel):
    group_id: int
    name: str
    reason: str | None = None


class ExperimentGroupResyncResult(BaseModel):
    created: int
    updated: int
    skipped: list[ExperimentGroupResyncSkipped] = Field(default_factory=list)


class ExperimentGroupAssignAnimals(BaseModel):
    animal_ids: list[int] = Field(min_length=1)


class ExperimentGroupAssignmentSummary(BaseModel):
    group_id: int
    group_name: str
    project_id: int
    planned_animal_count: int
    assigned_count: int
    cage_count: int
    animals: list[dict] = Field(default_factory=list)


class ProjectUnassignedAnimal(BaseModel):
    id: int
    animal_number: str | None = None
    status: str | None = None
    cage_id: int | None = None


class ExperimentPlanningStatus(BaseModel):
    project_id: int
    project_status: str | None = None
    approved_animal_count: int | None = None
    annexure_i_total: int | None = None
    planned_animal_total: int
    remaining_animals: int | None = None
    group_count: int
    is_complete: bool
    can_create_requisition: bool
    planned_exceeds_iaec_cap: bool = False
    annexure_differs_from_iaec: bool = False
    planned_differs_from_annexure: bool = False
    message: str | None = None


class ProjectWorkflowStatus(BaseModel):
    planning_complete: bool
    has_requisition: bool
    has_allocation: bool
    has_experiment_log: bool
    can_create_requisition: bool


class ProjectWorkspaceRead(BaseModel):
    project: IAECProject
    form_b_id: int | None = None
    form_b_submitted: bool = False
    form_b_submitted_at: datetime | None = None
    investigators: list[dict] = []
    planning: ExperimentPlanningStatus
    groups: list[ExperimentGroup]
    requisitions: list[dict] = []
    allocations: list[dict] = []
    experiments: list[dict] = []
    group_assignments: list[ExperimentGroupAssignmentSummary] = Field(default_factory=list)
    unassigned_animals: list[ProjectUnassignedAnimal] = Field(default_factory=list)
    workflow: ProjectWorkflowStatus
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
    meeting_time: str = Field(..., min_length=1, max_length=50)
    venue: str = Field(..., min_length=1, max_length=500)
    minutes: str = ""


class IAECMeetingRead(BaseModel):
    id: int
    date: date
    meeting_number: str | None = None
    meeting_time: str | None = None
    venue: str | None = None
    minutes: str
    model_config = ConfigDict(from_attributes=True)
