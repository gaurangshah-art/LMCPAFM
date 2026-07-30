import { apiClient } from "./client";

export interface LookupOption {
  id: number;
  name: string;
}

async function fetchLookup(endpoint: string): Promise<LookupOption[]> {
  const { data } = await apiClient.get<LookupOption[]>(endpoint);
  return data;
}

export function getApprovedProtocolOptions() {
  return fetchLookup("/lookup/approved-protocols");
}

export function getApprovedSpeciesOptions() {
  return fetchLookup("/lookup/approved-species");
}

export async function getApprovedStrainsOptions(speciesId?: number) {
  const query = speciesId && speciesId > 0 ? `?species_id=${speciesId}` : "";
  return fetchLookup(`/lookup/approved-strains${query}`);
}

export function getApprovedGenderOptions() {
  return fetchLookup("/lookup/approved-genders");
}

export function getApprovedExperimentGroupOptions() {
  return fetchLookup("/lookup/approved-experiment-groups");
}

export function getApprovedRequisitionOptions() {
  return fetchLookup("/lookup/approved-requisitions");
}

export async function getApprovedRequisitionItemOptions(requisitionId?: number) {
  const query = requisitionId && requisitionId > 0 ? `?requisition_id=${requisitionId}` : "";
  return fetchLookup(`/lookup/approved-requisition-items${query}`);
}

export function getApprovedAllocationOptions() {
  return fetchLookup("/lookup/approved-allocations");
}

export async function getApprovedAnimalOptions(allocationId?: number) {
  const query =
    allocationId && allocationId > 0 ? `?allocation_id=${allocationId}` : "";
  return fetchLookup(`/lookup/approved-animals${query}`);
}

export function getApprovedExperimentOptions() {
  return fetchLookup("/lookup/approved-experiments");
}
