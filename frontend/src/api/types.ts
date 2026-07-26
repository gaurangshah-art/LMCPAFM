// ---------------- AUTH ----------------
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

export interface InvestigatorRegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface InvestigatorRegisterResponse {
  id: number;
  name: string;
  email: string;
  roles: string[];
  status: boolean;
}

export interface ApiErrorResponse {
  detail?: string;
}

// ---------------- ADMIN ----------------
export interface SystemSummary {
  total_users: number;
  total_projects: number;
  total_requisitions: number;
  total_allocations: number;
  total_experiments: number;
}

export interface ActivityLog {
  timestamp: string;
  user_name: string;
  action: string;
  details: string;
}

// ---------------- USER ----------------
export type UserRole = "investigator" | "staff" | "iaec" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role?: UserRole;
  roles: UserRole[];
  status?: boolean;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roles?: UserRole[];
}

// ---------------- IAEC CERTIFICATE ----------------
export interface IAECApprovalCertificate {
  lmcp_iaec_id: string;
  title: string;
  investigator: string;
  department: string;
  meeting_year: number;
  meeting_number: number;
  meeting_date: string;
  approval_date: string;
  comments: string;
  chairperson_name: string;
}

// ---------------- IAEC MEETING ----------------
export interface IAECMeeting {
  id: number;
  meeting_year: number;
  meeting_number: number;
  meeting_date: string;
  status: string;
}

export interface IAECMeetingRecord {
  id: number;
  date: string;
  meeting_number: string | null;
  minutes: string;
}

export interface IAECMeetingCreate {
  date: string;
  meeting_number?: string | null;
  minutes?: string;
}

// ---------------- FORM B WITH MEETING (IAEC LIST) ----------------
export interface FormBWithMeeting {
  form_b_id: number;
  project_id: number;
  project_title: string;
  form_b_date: string;
  meeting_id: number | null;
  meeting_date: string | null;
  meeting_number: string | null;
  protocol_number: string | null;
  decision: string | null;
  approved_animal_count: number | null;
  decision_remarks: string | null;
}

export type FormBMeetingDecisionValue =
  | "approved"
  | "approved_with_revisions"
  | "rejected"
  | "animal_count_amended";

export interface FormBMeetingDecisionUpsert {
  meeting_id: number;
  decision: FormBMeetingDecisionValue;
  approved_animal_count?: number | null;
  remarks?: string | null;
}

export interface IAECSubmittedForm {
  id: number;
  principal_investigator: string;
  title: string;
}

export interface IAECReviewProject {
  id: number;
  form_b_id: number;
  meeting_id?: number;
  meeting_year?: number;
  meeting_number?: number;
  lmcp_iaec_id?: string | null;
  investigator?: string;
  title?: string;
  status?: string;
}

// ---------------- IAEC PROJECT ----------------
export interface IAECProjectCreate {
  title: string;
  investigator_name: string;
  protocol_number?: string | null;
  approval_date?: string | null;
  principal_investigator?: string | null;
  purpose?: string | null;
  status?: string | null;
  objective?: string | null;
  start_date?: string | null;
}

export interface IAECProject extends IAECProjectCreate {
  id: number;
  investigator?: string;
  lmcp_iaec_id?: string;
  form_b_id?: number;
  meeting_id?: number;
  meeting_year?: number;
  meeting_number?: number;
  species?: string;
  animal_count?: number;
  summary?: string;
  comments?: string[];
  experiment_groups?: ExperimentGroup[];
}

// ---------------- FORM B ----------------
export interface FormB {
  id: number;
  step1: unknown;
  step2: unknown;
  step3: unknown;
  step4: unknown;
  step5: unknown;
  step6: unknown;
  step7: unknown;
}

// ---------------- EXPERIMENT GROUP ----------------
export interface ExperimentGroupCreate {
  name: string;
  project_id: number;
}

export interface ExperimentGroup {
  id: number;
  project_id: number;
  name: string;
  purpose?: string;
  experiments: AnimalExperiment[];
}

// ---------------- ANIMAL EXPERIMENT (IAEC) ----------------
export interface AnimalExperimentCreate {
  description: string;
  group_id: number;
}

export interface AnimalExperiment {
  id: number;
  group_id: number;
  experiment_name?: string;
  description: string;
}

// ---------------- REQUISITION (API) ----------------
export interface AnimalRequisitionItemCreate {
  species_id: number;
  strain_id: number;
  requested_count: number;
}

export interface AnimalAllocationAnimal {
  id: number;
  species_id: number;
  strain_id: number;
  cage_id?: number | null;
  status?: string | null;
  protocol_id?: number | null;
}

export interface AnimalAllocationItem {
  id: number;
  allocation_id: number;
  requisition_item_id: number;
  allocated_count: number;
  remaining_count: number;
  timestamp: string;
  animals: AnimalAllocationAnimal[];
}

export interface AnimalRequisitionItem extends AnimalRequisitionItemCreate {
  id: number;
  requisition_id: number;
  allocations: AnimalAllocationItem[];
}

export interface AnimalRequisitionCreate {
  protocol_id: number;
  requester_name: string;
  requester_role: string;
  date: string;
  purpose: string;
  items: AnimalRequisitionItemCreate[];
}

export interface AnimalRequisition extends AnimalRequisitionCreate {
  id: number;
  items: AnimalRequisitionItem[];
  status?: string;
  submitted_at?: string;
  staff_review_at?: string;
  iaec_review_at?: string;
  comments?: { text: string; created_at: string }[];
}

// ---------------- ALLOCATION (API) ----------------
export interface AnimalAllocationItemCreate {
  requisition_item_id: number;
  allocated_count: number;
  remaining_count: number;
}

export interface AnimalAllocationCreate {
  requisition_id: number;
  date: string;
  allocated_by: string;
  remarks: string;
  items: AnimalAllocationItemCreate[];
}

export interface AnimalAllocation extends AnimalAllocationCreate {
  id: number;
  items: AnimalAllocationItem[];
}

// ---------------- EXPERIMENT (FACILITY) ----------------
export interface ExperimentAnimalCreate {
  animal_id: number;
}

export interface ExperimentAnimal extends ExperimentAnimalCreate {
  id: number;
  experiment_id: number;
}

export interface ExperimentCreate {
  protocol_id: number;
  allocation_id: number;
  date: string;
  performed_by: string;
  purpose: string;
  procedure: string;
  dose: string;
  observations: string;
  start_time?: string | null;
  end_time?: string | null;
  animals: ExperimentAnimalCreate[];
}

export interface Experiment extends ExperimentCreate {
  id: number;
  animals: ExperimentAnimal[];
}

// ---------------- REQUISITION (VIEW) ----------------
export interface Requisition {
  id: number;
  lmcp_iaec_id: string;
  investigator_name: string;
  species: string;
  strain: string;
  sex: string;
  age: string;
  quantity_requested: number;
  purpose: string;
  status: string;
  submitted_at?: string;
  staff_review_at?: string;
  iaec_review_at?: string;
  approved_at?: string;
  remarks?: string;
  comments: { text: string; created_at: string }[];
}

// ---------------- ALLOCATION (VIEW) ----------------
export interface Allocation {
  id: number;
  requisition_id: number;
  species: string;
  strain: string;
  sex: string;
  age: string;
  quantity_allocated: number;
  staff_name?: string;
  date?: string;
}

// ---------------- FINAL REPORT ----------------
export interface FinalReportGroup {
  id: number;
  name: string;
  size?: number;
}

export interface FinalReport {
  summary: string;
  group_results?: Record<number, string>;
  mortality_summary?: string;
  endpoint_summary?: string;
  adverse_events?: string;
  conclusion: string;
}
