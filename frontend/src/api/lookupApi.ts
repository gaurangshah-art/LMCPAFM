import { apiClient } from "./client";

export interface LookupOption {
  id: number;
  name: string;
}

async function fetchLookup(endpoint: string): Promise<LookupOption[]> {
  const { data } = await apiClient.get<LookupOption[]>(endpoint);
  return data;
}

export function getSpeciesOptions() {
  return fetchLookup("/species");
}

export function getStrainOptions() {
  return fetchLookup("/strain");
}

export function getProtocolOptions() {
  return fetchLookup("/protocol");
}

export function getExperimentGroupOptions() {
  return fetchLookup("/experiment-group");
}

export function getProjectOptions() {
  return fetchLookup("/project");
}

export function getRequisitionOptions() {
  return fetchLookup("/requisition");
}

export function getRequisitionItemOptions() {
  return fetchLookup("/requisition-item");
}

export function getAllocationOptions() {
  return fetchLookup("/allocation");
}

export function getAnimalOptions() {
  return fetchLookup("/animal");
}
