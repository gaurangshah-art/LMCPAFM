from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field, model_validator


STUDY_PHASE_CODES = frozenset({"main", "pilot", "pivotal", "dose_finding", "extension", "other"})
GROUP_ROLES = frozenset({"control", "sham", "treatment", "baseline", "other"})
FATE_TYPES = frozenset({"sacrifice", "euthanasia", "rehabilitation", "reuse", "other"})
SCHEDULE_TYPES = frozenset({"single", "recurring", "window"})


TREATMENT_GROUP_ROLES = frozenset({"treatment", "sham"})


class FormBGroupDosingEntry(BaseModel):
    agent_name: str = Field(..., min_length=1, max_length=200)
    dose: str = Field(..., min_length=1, max_length=200)
    route: str = Field(..., min_length=1, max_length=100)
    frequency: str = Field(..., min_length=1, max_length=100)
    start_day: int | None = Field(None, ge=0)
    end_day: int | None = Field(None, ge=0)
    volume: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=5000)


class FormBGroupEndpointEntry(BaseModel):
    parameter_code: str = Field(..., max_length=100)
    parameter_name: str = Field(..., max_length=200)
    schedule_type: str = Field("single", max_length=50)
    schedule_detail: str = Field(..., max_length=200)
    method: str | None = Field(None, max_length=200)
    notes: str | None = Field(None, max_length=5000)


class FormBGroupFateEntry(BaseModel):
    fate_type: str = Field(..., max_length=50)
    count: int = Field(..., ge=0)
    method_or_destination: str | None = Field(None, max_length=500)
    timing: str | None = Field(None, max_length=200)


class FormBStudyGroupEntry(BaseModel):
    group_code: str = Field(..., min_length=1, max_length=50)
    group_name: str = Field(..., min_length=1, max_length=200)
    role: str = Field("other", max_length=50)
    animal_count: int = Field(..., ge=1)
    species_id: int = Field(..., ge=1)
    strain_id: int = Field(..., ge=1)
    sex: str = Field(..., min_length=1, max_length=50)
    age: str = Field(..., min_length=1, max_length=100)
    weight_range: str = Field(..., min_length=1, max_length=100)
    feeding_diet: str = Field(..., min_length=1, max_length=200)
    housing_notes: str | None = Field(None, max_length=5000)
    treatment_summary: str | None = Field(None, max_length=5000)
    dosing: list[FormBGroupDosingEntry] = Field(default_factory=list)
    endpoints: list[FormBGroupEndpointEntry] = Field(..., min_length=1)
    fates: list[FormBGroupFateEntry] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validate_treatment_group_details(self):
        if self.role not in GROUP_ROLES:
            raise ValueError(f"Invalid group role '{self.role}'.")
        if self.role in TREATMENT_GROUP_ROLES:
            if not (self.treatment_summary or "").strip():
                raise ValueError(
                    f"Group '{self.group_name}' requires a treatment summary."
                )
            if not self.dosing:
                raise ValueError(
                    f"Group '{self.group_name}' requires at least one dosing entry."
                )
        return self


class FormBStudyPhaseEntry(BaseModel):
    phase_code: str = Field("main", max_length=50)
    phase_name: str = Field(..., min_length=1, max_length=200)
    sequence_order: int = Field(..., ge=1)
    objective: str = Field(..., min_length=1, max_length=5000)
    planned_start_date: date
    planned_duration_weeks: int = Field(..., ge=1)
    animal_cap: int = Field(..., ge=1)
    contingency_note: str | None = Field(None, max_length=5000)
    depends_on_sequence_order: int | None = Field(None, ge=1)
    reuse_animals_allowed: bool = False
    groups: list[FormBStudyGroupEntry] = Field(..., min_length=1)


class FormBStudyPlanSave(BaseModel):
    form_b_id: int
    design_rationale: str = Field(..., min_length=1, max_length=5000)
    phases: list[FormBStudyPhaseEntry] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validate_unique_phase_order(self):
        orders = [phase.sequence_order for phase in self.phases]
        if len(orders) != len(set(orders)):
            raise ValueError("Each study phase must have a unique sequence order.")
        return self


class FormBStudyPlanRead(BaseModel):
    form_b_id: int
    design_rationale: str = ""
    phases: list[dict] = Field(default_factory=list)
    total_animals: int = 0
    phase_count: int = 0
    group_count: int = 0
