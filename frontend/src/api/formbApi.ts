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
