import { apiClient } from "./client";

export interface FormDDetails {
  protocol_number: string | null;
  approval_date: string | null;
  title: string;
  principal_investigator: string | null;
  purpose: string | null;
  allocated_count: number;
  used_in_experiment: number;
  disposed_count: number;
  remaining_count: number;
  allocations: Array<Record<string, unknown>>;
  allocation_items: Array<Record<string, unknown>>;
  experiments: Array<Record<string, unknown>>;
  disposals: Array<Record<string, unknown>>;
}

export async function getFormDDetails(protocolId: number): Promise<FormDDetails> {
  const { data } = await apiClient.get<FormDDetails>(`/formd/${protocolId}`);
  return data;
}
