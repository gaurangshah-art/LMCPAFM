from datetime import date, datetime
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
    project_role: str = Field(..., max_length=200)
    user_id: Optional[int] = None
    investigator_type: Optional[str] = Field(None, max_length=100)
    can_view_status: Optional[bool] = None
    can_view_approval_letters: Optional[bool] = None
    can_edit_forms: Optional[bool] = None
    can_submit_form_b: Optional[bool] = None


class FormBInvestigatorRead(BaseModel):
    id: int
    form_b_id: int
    name: str
    project_role: str
    user_id: Optional[int] = None
    investigator_profile_user_id: Optional[int] = None
    investigator_type: Optional[str] = None
    can_view_status: bool
    can_view_approval_letters: bool
    can_edit_forms: bool
    can_submit_form_b: bool

    class Config:
        orm_mode = True


class FormBStep1AutofillRead(BaseModel):
    establishment_name: Optional[str] = None
    establishment_address: Optional[str] = None
    registration_number: Optional[str] = None
    registration_date: Optional[str] = None
    animal_housing_location: Optional[str] = None
    experiment_location: Optional[str] = None
    principal_investigator: str
    designation: Optional[str] = None
    department: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    qualifications: Optional[str] = None
    experience: Optional[str] = None
    profile_complete: bool


class FormBStartRead(BaseModel):
    id: int
    project_id: int


class FormBStep1Save(BaseModel):
    form_b_id: int
    principal_investigator: str = Field(..., max_length=200)
    designation: str = Field(..., max_length=200)
    department: str = Field(..., max_length=200)
    contact_email: str = Field(..., max_length=255)
    contact_phone: str = Field(..., max_length=50)
    qualifications: str = Field(..., max_length=255)
    experience: str = Field("", max_length=5000)
    research_type: str = Field(..., max_length=100)


class FormBStep2Save(BaseModel):
    form_b_id: int
    title: str = Field(..., max_length=500)
    duration_months: int = Field(..., ge=1, le=60)
    proposed_start_date: str = Field(..., max_length=20)
    proposed_completion_date: str = Field(..., max_length=20)
    funding_agency: str = Field(..., max_length=200)
    funding_address: str = Field(..., max_length=1000)
    funding_proof_reference: str = Field("", max_length=500)
    summary: str = Field(..., max_length=5000)
    objectives: str = Field(..., max_length=5000)
    expected_outcomes: str = Field(..., max_length=5000)
    study_plan_annexure_reference: str = Field("", max_length=500)


class FormBYearWiseCountEntry(BaseModel):
    year: str = Field(..., max_length=20)
    count: int = Field(..., ge=0)


class FormBAnimalRequirementEntry(BaseModel):
    species: str = Field(..., max_length=200)
    strain: str = Field(..., max_length=200)
    sex: str = Field(..., max_length=50)
    age: str = Field(..., max_length=100)
    weight: str = Field(..., max_length=100)
    number_required: int = Field(..., ge=1)
    source: str = Field(..., max_length=200)
    justification: str = Field(..., max_length=5000)
    year_wise_breakup: list[FormBYearWiseCountEntry] = Field(default_factory=list)
    days_housed: int = Field(..., ge=1)
    breeder_name: str = Field(..., max_length=500)
    breeder_address: str = Field(..., max_length=1000)
    breeder_registration_number: str = Field(..., max_length=200)


class FormBStep3Save(BaseModel):
    form_b_id: int
    why_animal_necessary: str = Field(..., max_length=5000)
    in_vitro_study_details: str = Field(..., max_length=5000)
    why_species_selected: str = Field(..., max_length=5000)
    why_number_essential: str = Field(..., max_length=5000)
    similar_experiments_in_establishment: str = Field(..., max_length=5000)
    justify_new_experiment: str = Field(..., max_length=5000)
    similar_experiments_elsewhere: str = Field(..., max_length=5000)
    requirements: list[FormBAnimalRequirementEntry] = Field(..., min_length=1)


class FormBStep4Save(BaseModel):
    form_b_id: int
    procedure_description: str = Field(..., max_length=5000)
    injection_substances: str = Field("", max_length=5000)
    injection_doses: str = Field("", max_length=5000)
    injection_sites: str = Field("", max_length=5000)
    injection_volumes: str = Field("", max_length=5000)
    blood_withdrawal_volumes: str = Field("", max_length=5000)
    blood_withdrawal_sites: str = Field("", max_length=5000)
    radiation_dosage_schedule: str = Field("", max_length=5000)
    compound_nce_details: str = Field("", max_length=5000)
    pain_category: str = Field(..., max_length=50)
    anaesthesia: str = Field(..., max_length=200)
    analgesia: str = Field(..., max_length=200)
    prohibit_analgesic_anesthetic: str = Field(..., max_length=10)
    prohibit_analgesic_justification: str = Field("", max_length=5000)
    survival_surgery: str = Field(..., max_length=10)
    surgical_procedures: str = Field("", max_length=5000)
    surgical_personnel: str = Field("", max_length=5000)
    post_operative_care: str = Field("", max_length=5000)
    repeat_surgery_justification: str = Field("", max_length=5000)
    euthanasia_method: str = Field(..., max_length=200)
    alternatives_considered: str = Field(..., max_length=5000)
    rationale_3rs: str = Field(..., max_length=5000)


class FormBStep5Save(BaseModel):
    form_b_id: int
    housing_conditions: str = Field(..., max_length=200)
    special_requirements: str = Field("", max_length=5000)
    feeding: str = Field(..., max_length=200)
    environmental_enrichment: str = Field(..., max_length=200)
    animal_transportation_methods: str = Field(..., max_length=5000)
    scope_for_reuse: str = Field(..., max_length=5000)
    rehabilitation_details: str = Field(..., max_length=5000)
    carcass_disposal_method: str = Field(..., max_length=5000)


class FormBAuthorizedPersonnelEntry(BaseModel):
    name: str = Field(..., max_length=200)
    designation: str = Field(..., max_length=200)
    department: str = Field(..., max_length=200)
    telephone: str = Field(..., max_length=50)
    email: str = Field(..., max_length=255)
    experience: str = Field(..., max_length=5000)


class FormBStep6Save(BaseModel):
    form_b_id: int
    authorized_personnel: list[FormBAuthorizedPersonnelEntry] = Field(..., min_length=1)
    training_level: str = Field(..., max_length=200)
    training_details: str = Field(..., max_length=5000)
    competency_certification: str = Field(..., max_length=200)


class FormBStep7Save(BaseModel):
    form_b_id: int
    hazardous_agents_used: str = Field(..., max_length=10)
    hazardous_agent_details: str = Field("", max_length=5000)
    aerb_approval_reference: str = Field("", max_length=500)
    ibsc_approval_reference: str = Field("", max_length=500)
    rcgm_approval_reference: str = Field("", max_length=500)
    other_hazardous_reference: str = Field("", max_length=500)
    cpcsea_adherence: str = Field(..., max_length=200)
    iaec_history: str = Field(..., max_length=5000)
    safety_measures: str = Field(..., max_length=200)
    endpoint_criteria: str = Field(..., max_length=200)
    declaration_not_duplicative: bool
    declaration_qualified: bool
    declaration_no_alternative: bool
    declaration_iaec_approval_for_changes: bool
    declaration_scientific_review: bool
    declaration_hazardous_certificates: bool
    declaration_form_d_records: bool
    declaration_no_start_before_approval: bool
    declaration_rehabilitation: bool
    declaration_signature_name: str = Field(..., max_length=200)
    declaration_date: str = Field(..., max_length=20)
    declaration_place: str = Field(..., max_length=200)


class FormBReviewRead(BaseModel):
    form_b_id: int
    submitted: bool
    step1: Optional[dict] = None
    step2: Optional[dict] = None
    step3: Optional[dict] = None
    step4: Optional[dict] = None
    step5: Optional[dict] = None
    step6: Optional[dict] = None
    step7: Optional[dict] = None


class FormBAttachmentRead(BaseModel):
    id: int
    form_b_id: int
    category: str
    original_filename: str
    content_type: Optional[str] = None
    file_size: int
    uploaded_at: datetime


class FormBSubmitRequest(BaseModel):
    form_b_id: int