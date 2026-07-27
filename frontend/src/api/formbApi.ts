import { apiClient } from "./client";

export interface FormBDetails {
  id: number;
  protocol_number: string | null;
  title: string;
  principal_investigator: string | null;
  purpose: string | null;
  approval_date: string | null;
}

export async function getFormBDetails(protocolId: number): Promise<FormBDetails> {
  const { data } = await apiClient.get<{
    id: number;
    protocol_number?: string | null;
    title: string;
    principal_investigator?: string | null;
    purpose?: string | null;
    approval_date?: string | null;
  }>(`/iaec/project/${protocolId}`);

  return {
    id: data.id,
    protocol_number: data.protocol_number ?? null,
    title: data.title,
    principal_investigator: data.principal_investigator ?? null,
    purpose: data.purpose ?? null,
    approval_date: data.approval_date ?? null,
  };
}

export interface FormBStep1Autofill {
  establishment_name: string | null;
  establishment_address: string | null;
  registration_number: string | null;
  registration_date: string | null;
  animal_housing_location: string | null;
  experiment_location: string | null;
  principal_investigator: string;
  designation: string | null;
  department: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  qualifications: string | null;
  experience: string | null;
  profile_complete: boolean;
}

export interface FormBStartResponse {
  id: number;
  project_id: number;
}

export interface FormBStep1Payload {
  form_b_id: number;
  principal_investigator: string;
  designation: string;
  department: string;
  contact_email: string;
  contact_phone: string;
  qualifications: string;
  experience: string;
  research_type: string;
}

export interface FormBStep2Payload {
  form_b_id: number;
  title: string;
  duration_months: number;
  proposed_start_date: string;
  proposed_completion_date: string;
  funding_agency: string;
  funding_address: string;
  funding_proof_reference: string;
  summary: string;
  objectives: string;
  expected_outcomes: string;
  study_plan_annexure_reference: string;
}

export interface FormBYearWiseCountEntry {
  year: string;
  count: number;
}

export interface FormBAnimalRequirementEntry {
  species: string;
  strain: string;
  sex: string;
  age: string;
  weight: string;
  number_required: number;
  source: string;
  justification: string;
  year_wise_breakup: FormBYearWiseCountEntry[];
  days_housed: number;
  breeder_name: string;
  breeder_address: string;
  breeder_registration_number: string;
}

export interface FormBStep3Payload {
  form_b_id: number;
  why_animal_necessary: string;
  in_vitro_study_details: string;
  why_species_selected: string;
  why_number_essential: string;
  similar_experiments_in_establishment: string;
  justify_new_experiment: string;
  similar_experiments_elsewhere: string;
  requirements: FormBAnimalRequirementEntry[];
}

export interface FormBStep4Payload {
  form_b_id: number;
  procedure_description: string;
  injection_substances: string;
  injection_doses: string;
  injection_sites: string;
  injection_volumes: string;
  blood_withdrawal_volumes: string;
  blood_withdrawal_sites: string;
  radiation_dosage_schedule: string;
  compound_nce_details: string;
  pain_category: string;
  anaesthesia: string;
  analgesia: string;
  prohibit_analgesic_anesthetic: string;
  prohibit_analgesic_justification: string;
  survival_surgery: string;
  surgical_procedures: string;
  surgical_personnel: string;
  post_operative_care: string;
  repeat_surgery_justification: string;
  euthanasia_method: string;
  alternatives_considered: string;
  rationale_3rs: string;
}

export interface FormBStep5Payload {
  form_b_id: number;
  housing_conditions: string;
  special_requirements: string;
  feeding: string;
  environmental_enrichment: string;
  animal_transportation_methods: string;
  scope_for_reuse: string;
  rehabilitation_details: string;
  carcass_disposal_method: string;
}

export interface FormBAuthorizedPersonnelEntry {
  name: string;
  designation: string;
  department: string;
  telephone: string;
  email: string;
  experience: string;
}

export interface FormBStep6Payload {
  form_b_id: number;
  authorized_personnel: FormBAuthorizedPersonnelEntry[];
  training_level: string;
  training_details: string;
  competency_certification: string;
}

export interface FormBStep7Payload {
  form_b_id: number;
  hazardous_agents_used: string;
  hazardous_agent_details: string;
  aerb_approval_reference: string;
  ibsc_approval_reference: string;
  rcgm_approval_reference: string;
  other_hazardous_reference: string;
  cpcsea_adherence: string;
  iaec_history: string;
  safety_measures: string;
  endpoint_criteria: string;
  declaration_not_duplicative: boolean;
  declaration_qualified: boolean;
  declaration_no_alternative: boolean;
  declaration_iaec_approval_for_changes: boolean;
  declaration_scientific_review: boolean;
  declaration_hazardous_certificates: boolean;
  declaration_form_d_records: boolean;
  declaration_no_start_before_approval: boolean;
  declaration_rehabilitation: boolean;
  declaration_signature_name: string;
  declaration_date: string;
  declaration_place: string;
}

export type FormBAttachmentCategory =
  | "funding_proof"
  | "study_plan_annexure"
  | "aerb_certificate"
  | "ibsc_certificate"
  | "rcgm_certificate"
  | "other_hazardous_certificate";

export interface FormBAttachmentRecord {
  id: number;
  form_b_id: number;
  category: FormBAttachmentCategory;
  original_filename: string;
  content_type: string | null;
  file_size: number;
  uploaded_at: string;
}

export async function listFormBAttachments(formBId: number): Promise<FormBAttachmentRecord[]> {
  const { data } = await apiClient.get<FormBAttachmentRecord[]>(`/formb/${formBId}/attachments`);
  return data;
}

export async function uploadFormBAttachment(
  formBId: number,
  category: FormBAttachmentCategory,
  file: File,
): Promise<FormBAttachmentRecord> {
  const body = new FormData();
  body.append("file", file);
  const { data } = await apiClient.post<FormBAttachmentRecord>(
    `/formb/${formBId}/attachments?category=${encodeURIComponent(category)}`,
    body,
    {
      timeout: 120000,
    },
  );
  return data;
}

export async function deleteFormBAttachment(formBId: number, attachmentId: number): Promise<void> {
  await apiClient.delete(`/formb/${formBId}/attachments/${attachmentId}`);
}

export async function downloadFormBAttachment(
  formBId: number,
  attachmentId: number,
  filename: string,
): Promise<void> {
  const response = await apiClient.get(`/formb/${formBId}/attachments/${attachmentId}`, {
    responseType: "blob",
  });
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(blobUrl);
}

export interface FormBReviewData {
  form_b_id: number;
  submitted: boolean;
  step1?: Record<string, unknown> | null;
  step2?: Record<string, unknown> | null;
  step3?: Record<string, unknown> | null;
  step4?: Record<string, unknown> | null;
  step5?: Record<string, unknown> | null;
  step6?: Record<string, unknown> | null;
  step7?: Record<string, unknown> | null;
}

export async function getFormBStep1Autofill(): Promise<FormBStep1Autofill> {
  const { data } = await apiClient.get<FormBStep1Autofill>("/formb/autofill/step-1");
  return data;
}

export async function startFormB(): Promise<FormBStartResponse> {
  const { data } = await apiClient.post<FormBStartResponse>("/formb/start");
  return data;
}

export async function saveFormBStep1(payload: FormBStep1Payload): Promise<void> {
  await apiClient.post("/formb/step-1", payload);
}

async function saveFormBStep<T extends { form_b_id: number }>(
  step: string,
  payload: T,
): Promise<void> {
  await apiClient.post(`/formb/${step}`, payload);
}

export async function saveFormBStep2(payload: FormBStep2Payload): Promise<void> {
  await saveFormBStep("step-2", payload);
}

export async function saveFormBStep3(payload: FormBStep3Payload): Promise<void> {
  await saveFormBStep("step-3", payload);
}

export async function saveFormBStep4(payload: FormBStep4Payload): Promise<void> {
  await saveFormBStep("step-4", payload);
}

export async function saveFormBStep5(payload: FormBStep5Payload): Promise<void> {
  await saveFormBStep("step-5", payload);
}

export async function saveFormBStep6(payload: FormBStep6Payload): Promise<void> {
  await saveFormBStep("step-6", payload);
}

export async function saveFormBStep7(payload: FormBStep7Payload): Promise<void> {
  await saveFormBStep("step-7", payload);
}

export async function getFormBReview(formBId: number): Promise<FormBReviewData> {
  const { data } = await apiClient.get<FormBReviewData>(`/formb/${formBId}/review`);
  return data;
}

export async function submitFormB(formBId: number): Promise<void> {
  await apiClient.post("/formb/submit", { form_b_id: formBId });
}

export const FORM_B_ID_STORAGE_KEY = "form_b_id";

export function storeFormBId(formBId: number): void {
  localStorage.setItem(FORM_B_ID_STORAGE_KEY, String(formBId));
}

export function readStoredFormBId(): number | null {
  const raw = localStorage.getItem(FORM_B_ID_STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface FormBInvestigatorRecord {
  id: number;
  form_b_id: number;
  name: string;
  project_role: string;
  user_id?: number | null;
  investigator_profile_user_id?: number | null;
  investigator_type?: string | null;
  can_view_status: boolean;
  can_view_approval_letters: boolean;
  can_edit_forms: boolean;
  can_submit_form_b: boolean;
}

export interface FormBInvestigatorPayload {
  form_b_id: number;
  name: string;
  project_role: string;
  user_id?: number | null;
  investigator_type?: string | null;
  can_view_status?: boolean;
  can_view_approval_letters?: boolean;
  can_edit_forms?: boolean;
  can_submit_form_b?: boolean;
}

export interface InvestigatorUserSearchResult {
  id: number;
  name: string;
  email: string;
}

export async function listFormBInvestigators(formBId: number): Promise<FormBInvestigatorRecord[]> {
  const { data } = await apiClient.get<FormBInvestigatorRecord[]>(`/formb/${formBId}/investigators`);
  return data;
}

export async function addFormBInvestigator(payload: FormBInvestigatorPayload): Promise<FormBInvestigatorRecord> {
  const { data } = await apiClient.post<FormBInvestigatorRecord>("/formb/investigators", payload);
  return data;
}

export async function removeFormBInvestigator(formBId: number, investigatorId: number): Promise<void> {
  await apiClient.delete(`/formb/${formBId}/investigators/${investigatorId}`);
}

export async function searchInvestigatorUsers(query: string): Promise<InvestigatorUserSearchResult[]> {
  const { data } = await apiClient.get<InvestigatorUserSearchResult[]>("/formb/investigator-users/search", {
    params: { q: query },
  });
  return data;
}

export async function linkFormBInvestigator(
  formBId: number,
  investigatorId: number,
  userId: number,
): Promise<FormBInvestigatorRecord> {
  const { data } = await apiClient.patch<FormBInvestigatorRecord>(
    `/formb/${formBId}/investigators/${investigatorId}`,
    { user_id: userId },
  );
  return data;
}

export function clearStoredFormBId(): void {
  localStorage.removeItem(FORM_B_ID_STORAGE_KEY);
}
