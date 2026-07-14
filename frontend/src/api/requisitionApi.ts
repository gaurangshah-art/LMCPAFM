import { apiClient } from "./client";
import type {
  AnimalRequisition,
  AnimalRequisitionCreate,
  AnimalAllocation,
  AnimalAllocationCreate,
} from "./types";

export async function createRequisition(payload: AnimalRequisitionCreate): Promise<AnimalRequisition> {
  const { data } = await apiClient.post<AnimalRequisition>("/iaec/requisition", payload);
  return data;
}

export async function getRequisition(reqId: number): Promise<AnimalRequisition> {
  const { data } = await apiClient.get<AnimalRequisition>(`/iaec/requisition/${reqId}`);
  return data;
}

export async function createAllocation(payload: AnimalAllocationCreate): Promise<AnimalAllocation> {
  const { data } = await apiClient.post<AnimalAllocation>("/iaec/allocation", payload);
  return data;
}

export async function getAllocation(allocationId: number): Promise<AnimalAllocation> {
  const { data } = await apiClient.get<AnimalAllocation>(`/iaec/allocation/${allocationId}`);
  return data;
}
