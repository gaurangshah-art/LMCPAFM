import { apiClient } from "./client";
import type {
  AnimalRequisition,
  AnimalRequisitionCreate,
  AnimalAllocation,
  AnimalAllocationCreate,
  AnimalExperiment
} from "./types";

export async function createRequisition(payload: AnimalRequisitionCreate): Promise<AnimalRequisition> {
  const { data } = await apiClient.post<AnimalRequisition>("/iaec/requisition", payload);
  return data;
}

export async function getRequisition(reqId: number): Promise<AnimalRequisition> {
  const { data } = await apiClient.get<AnimalRequisition>(`/iaec/requisition/${reqId}`);
  return data;
}

// ⭐ NEW — required by RequisitionViewPage.tsx
export async function getRequisitionById(reqId: number): Promise<AnimalRequisition> {
  const { data } = await apiClient.get<AnimalRequisition>(`/iaec/requisition/${reqId}`);
  return data;
}

// ⭐ REQUIRED BY RequisitionViewPage.tsx
export async function getAllocationsByRequisition(
  reqId: number
): Promise<AnimalAllocation[]> {
  const { data } = await apiClient.get<AnimalAllocation[]>(
    `/iaec/allocation/requisition/${reqId}`
  );
  return data;
}

// ⭐ REQUIRED BY RequisitionViewPage.tsx
export async function getExperimentsByRequisition(
  reqId: number
): Promise<AnimalExperiment[]> {
  const { data } = await apiClient.get<AnimalExperiment[]>(
    `/iaec/experiment/requisition/${reqId}`
  );
  return data;
}

export async function approveRequisitionStaff(
  requisitionId: number
): Promise<AnimalRequisition> {
  const { data } = await apiClient.post<AnimalRequisition>(
    `/iaec/requisition/${requisitionId}/staff-approve`
  );
  return data;
}

export async function approveRequisitionIAEC(
  requisitionId: number
): Promise<AnimalRequisition> {
  const { data } = await apiClient.post<AnimalRequisition>(
    `/iaec/requisition/${requisitionId}/approve`
  );
  return data;
}

export async function addRequisitionComment(
  requisitionId: number,
  comment: string
): Promise<AnimalRequisition> {
  const { data } = await apiClient.post<AnimalRequisition>(
    `/iaec/requisition/${requisitionId}/comment`,
    { comment }
  );
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
