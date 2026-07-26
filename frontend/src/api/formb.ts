import { apiClient } from "./client";

export async function fetchFormB(protocolNumber: string) {
  const { data } = await apiClient.get(`/formb/${protocolNumber}`);
  return data;
}
