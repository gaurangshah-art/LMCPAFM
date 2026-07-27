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
  registration_number: string | null;
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
  establishment_name: string;
  registration_number: string;
  principal_investigator: string;
  designation: string;
  department: string;
  contact_email: string;
  contact_phone: string;
  qualifications: string;
  experience: string;
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

export interface FormBStep2Payload {
  form_b_id: number;
  title: string;
  duration_months: number;
  funding_agency: string;
  summary: string;
  objectives: string;
  expected_outcomes: string;
}

export interface FormBStep3Payload {
  form_b_id: number;
  species: string;
  strain: string;
  sex: string;
  age: string;
  weight: string;
  number_required: number;
  source: string;
  justification: string;
}

export interface FormBStep4Payload {
  form_b_id: number;
  procedure_description: string;
  pain_category: string;
  anaesthesia: string;
  analgesia: string;
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
}

export interface FormBStep6Payload {
  form_b_id: number;
  personnel_names: string[];
  training_level: string;
  training_details: string;
  competency_certification: string;
}

export interface FormBStep7Payload {
  form_b_id: number;
  cpcsea_adherence: string;
  iaec_history: string;
  safety_measures: string;
  endpoint_criteria: string;
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

export function clearStoredFormBId(): void {
  localStorage.removeItem(FORM_B_ID_STORAGE_KEY);
}
