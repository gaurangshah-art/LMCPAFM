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
  roles: UserRole[];
  status?: boolean;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
  status?: boolean;
}

// ---------------- IAEC CERTIFICATE ----------------
export interface IAECApprovalCertificate {
  certificate_type: "provisional" | "final";
  is_final: boolean;
  publication_ready: boolean;
  publication_note?: string | null;
  signed_certificate?: ProjectSignedCertificate | null;
  work_state: "not_initiated" | "in_progress" | "completed";
  disclaimer?: string | null;
  final_attestation?: string | null;
  completion_date?: string | null;
  lmcp_iaec_id: string;
  title: string;
  investigator: string;
  department: string;
  establishment_name?: string;
  cpcsea_registration_number?: string;
  cpcsea_registration_date?: string;
  meeting_year?: number | null;
  meeting_number?: string | null;
  meeting_date?: string | null;
  approval_date?: string | null;
  approved_animal_count?: number | null;
  comments: string;
  chairperson_name: string;
  decision?: string | null;
  usage_summary?: {
    planned_animals: number;
    allocated_animals: number;
    logged_animals: number;
    pending_allocated_animals: number;
  };
  completion_status?: {
    planning_complete: boolean;
    work_initiated: boolean;
    groups_logged: boolean;
    all_allocated_logged: boolean;
    blocking_reasons: string[];
    groups: Array<{
      group_id: number;
      group_name: string;
      planned_animal_count: number;
      logged_animal_count: number;
      is_complete: boolean;
    }>;
  };
}

export interface ProjectSignedCertificate {
  id: number;
  project_id: number;
  original_filename: string;
  content_type?: string | null;
  file_size: number;
  uploaded_by_user_id?: number | null;
  uploaded_by_name?: string | null;
  uploaded_at?: string | null;
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

export interface InvestigatorProjectSummary {
  id: number;
  title: string;
  investigator_name: string;
  protocol_number?: string | null;
  approval_date?: string | null;
  principal_investigator?: string | null;
  status?: string | null;
  form_b_id?: number | null;
  meeting_id?: number | null;
  meeting_year?: number | null;
  meeting_number?: string | null;
  submitted_at?: string | null;
  experiment_group_count: number;
  experiment_count: number;
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
  planned_animal_count: number;
}

export interface ExperimentGroup {
  id: number;
  project_id: number;
  name: string;
  planned_animal_count: number;
  purpose?: string;
  experiments: AnimalExperiment[];
}

export interface ExperimentPlanningStatus {
  project_id: number;
  project_status?: string | null;
  approved_animal_count?: number | null;
  planned_animal_total: number;
  remaining_animals?: number | null;
  group_count: number;
  is_complete: boolean;
  can_create_requisition: boolean;
  message?: string | null;
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
  experiment_group_id?: number | null;
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
  experiment_group_id: number;
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

export interface ProjectWorkflowStatus {
  planning_complete: boolean;
  has_requisition: boolean;
  has_allocation: boolean;
  has_experiment_log: boolean;
  can_create_requisition: boolean;
}

export interface ProjectWorkspaceInvestigator {
  id: number;
  form_b_id: number;
  name: string;
  project_role: string;
  user_id?: number | null;
  investigator_type?: string | null;
  is_linked: boolean;
  can_edit_forms: boolean;
  can_submit_form_b: boolean;
}

export interface ProjectWorkspaceRequisition {
  id: number;
  protocol_id: number;
  date: string;
  purpose: string;
  requester_name: string;
  item_count: number;
  requested_total: number;
}

export interface ProjectWorkspaceAllocation {
  id: number;
  requisition_id: number;
  date: string;
  allocated_by: string;
  item_count: number;
}

export interface ProjectWorkspaceExperiment {
  id: number;
  protocol_id: number;
  allocation_id: number;
  experiment_group_id: number;
  date: string;
  performed_by: string;
  purpose: string;
  procedure: string;
  animal_count: number;
}

export interface ProjectWorkspace {
  project: IAECProject;
  form_b_id?: number | null;
  investigators: ProjectWorkspaceInvestigator[];
  planning: ExperimentPlanningStatus;
  groups: ExperimentGroup[];
  requisitions: ProjectWorkspaceRequisition[];
  allocations: ProjectWorkspaceAllocation[];
  experiments: ProjectWorkspaceExperiment[];
  group_assignments: ExperimentGroupAssignmentSummary[];
  unassigned_animals: ProjectUnassignedAnimal[];
  workflow: ProjectWorkflowStatus;
}

export interface ExperimentGroupAssignmentSummary {
  group_id: number;
  group_name: string;
  project_id: number;
  planned_animal_count: number;
  assigned_count: number;
  cage_count: number;
  animals: Array<{
    id: number;
    animal_number?: string | null;
    status?: string | null;
    cage_id?: number | null;
  }>;
}

export interface ProjectUnassignedAnimal {
  id: number;
  animal_number?: string | null;
  status?: string | null;
  cage_id?: number | null;
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

// ---------------- FORM C (INVENTORY REGISTER) ----------------
export interface FormCStockRow {
  date: string;
  number_in_stock: number;
  species_id: number;
  species_name: string;
  strain_id: number;
  strain_name: string;
  sex?: string | null;
  age?: string | null;
  voucher_or_bill_number?: string | null;
}

export interface FormCAcquisitionRow {
  date: string;
  number_acquired: number;
  supplier_name?: string | null;
  supplier_address?: string | null;
  acquired_from?: string | null;
  species_id: number;
  species_name: string;
  strain_id: number;
  strain_name: string;
  sex?: string | null;
  age?: string | null;
  voucher_or_bill_number?: string | null;
  procurement_id: number;
}

export interface FormCSuppliedRow {
  date: string;
  number_supplied: number;
  destination_name?: string | null;
  destination_address?: string | null;
  destination_registration_number?: string | null;
  species_id: number;
  species_name: string;
  strain_id: number;
  strain_name: string;
  sex?: string | null;
  age?: string | null;
  allocation_id: number;
}

export interface FormCData {
  as_of_date: string;
  stock_rows: FormCStockRow[];
  acquisition_rows: FormCAcquisitionRow[];
  breeding_rows?: FormCBreedingRow[];
  disposal_rows?: FormCDisposalRow[];
  supplied_rows: FormCSuppliedRow[];
}

export interface FormCBreedingRow {
  date: string;
  number_born: number;
  litter_count: number;
  species_name: string;
  strain_name: string;
  breeding_record_id: number;
  remarks?: string | null;
}

export interface FormCDisposalRow {
  date: string;
  animal_id: number;
  animal_number?: string | null;
  method: string;
  reason: string;
  species_name: string;
  strain_name: string;
  disposal_id: number;
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
