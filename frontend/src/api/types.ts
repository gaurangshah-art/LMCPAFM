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

// ---------------- IAEC PROJECT (VIEW) ----------------
export interface IAECProject {
  id: number;
  lmcp_iaec_id: string;
  form_b_id: number;
  investigator: string;
  title: string;
  species: string;
  animal_count: number;
  summary: string;
  comments: string[];
  meeting_year: number;
  meeting_number: number;
  status: string;
}

// ---------------- IAEC PROJECT (CREATE) ----------------
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

// ---------------- FORM B ----------------
export interface FormB {
  id: number;
  step1: any;
  step2: any;
  step3: any;
  step4: any;
  step5: any;
  step6: any;
  step7: any;
}

// ---------------- EXPERIMENT GROUP ----------------
export interface ExperimentGroup {
  id: number;
  project_id: number;
  group_name: string;
  purpose: string;
}

// ---------------- ANIMAL EXPERIMENT ----------------
export interface AnimalExperiment {
  id: number;
  group_id: number;
  experiment_name: string;
  description: string;
}

// ---------------- REQUISITION ----------------
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

// ---------------- ALLOCATION ----------------
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

// ---------------- USER ----------------
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export type UserRole = "investigator" | "staff" | "iaec" | "admin";
