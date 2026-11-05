import { apiClient } from "./client";
import type { FormCData } from "./types";

export async function getFormCData(): Promise<FormCData> {
  const { data } = await apiClient.get<FormCData>("/inventory/form-c-data");
  return data;
}
