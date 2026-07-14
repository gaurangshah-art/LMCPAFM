import { apiClient } from "./client";

export interface FormBDetails {
  protocol_id: number;
  protocol_number: string | null;
  title: string | null;
  principal_investigator: string | null;
  purpose: string | null;
  approval_date: string | null;
  source: string;
}

export async function getFormBDetails(protocolId: number): Promise<FormBDetails> {
  const { data } = await apiClient.get<FormBDetails>(`/formb/${protocolId}`);
  return data;
}
