import { apiClient } from "./client";

export interface InvestigatorProfile {
  user_id: number;
  institutional_email: string | null;
  institution_name: string | null;
  department: string | null;
  designation: string | null;
  age: number | null;
  qualification: string | null;
  years_experience: number | null;
  animal_handling_experience: string | null;
  is_lmcp_faculty: boolean;
  is_complete: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface InvestigatorProfileUpdate {
  institutional_email?: string | null;
  institution_name?: string | null;
  department?: string | null;
  designation?: string | null;
  age?: number | null;
  qualification?: string | null;
  years_experience?: number | null;
  animal_handling_experience?: string | null;
  is_lmcp_faculty?: boolean;
}

export async function getMyInvestigatorProfile(): Promise<InvestigatorProfile> {
  const { data } = await apiClient.get<InvestigatorProfile>("/investigator-profile/me");
  return data;
}

export async function updateMyInvestigatorProfile(
  payload: InvestigatorProfileUpdate,
): Promise<InvestigatorProfile> {
  const { data } = await apiClient.put<InvestigatorProfile>("/investigator-profile/me", payload);
  return data;
}
