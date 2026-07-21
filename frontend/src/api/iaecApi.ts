import { apiClient } from "./client";
import type {
  IAECProject,
  IAECProjectCreate,
  ExperimentGroup,
  ExperimentGroupCreate,
  AnimalExperiment,
  AnimalExperimentCreate,
} from "./types";

export async function createProject(payload: IAECProjectCreate): Promise<IAECProject> {
  const { data } = await apiClient.post<IAECProject>("/iaec/project", payload);
  return data;
}

export async function getProjects(): Promise<IAECProject[]> {
  const { data } = await apiClient.get<IAECProject[]>("/iaec/project");
  return data;
}

// ⭐ NEW — required by InvestigatorDashboardPage
export async function getProjectsByInvestigator(investigatorId: number): Promise<IAECProject[]> {
  const { data } = await apiClient.get<IAECProject[]>(
    `/iaec/project/investigator/${investigatorId}`
  );
  return data;
}

export async function createGroup(payload: ExperimentGroupCreate): Promise<ExperimentGroup> {
  const { data } = await apiClient.post<ExperimentGroup>("/iaec/group", payload);
  return data;
}

export async function getGroupsByProject(projectId: number): Promise<ExperimentGroup[]> {
  const { data } = await apiClient.get<ExperimentGroup[]>(`/iaec/group/${projectId}`);
  return data;
}

export async function createIAECExperiment(payload: AnimalExperimentCreate): Promise<AnimalExperiment> {
  const { data } = await apiClient.post<AnimalExperiment>("/iaec/experiment", payload);
  return data;
}

export async function getIAECExperimentsByGroup(groupId: number): Promise<AnimalExperiment[]> {
  const { data } = await apiClient.get<AnimalExperiment[]>(`/iaec/experiment/${groupId}`);
  return data;
}

// -----------------------------
// IAEC PROJECT — FULL CRUD
// -----------------------------

export async function getProjectById(projectId: number): Promise<IAECProject> {
  const { data } = await apiClient.get<IAECProject>(`/iaec/project/${projectId}`);
  return data;
}

export async function updateProject(
  projectId: number,
  payload: Partial<IAECProjectCreate>
): Promise<IAECProject> {
  const { data } = await apiClient.put<IAECProject>(`/iaec/project/${projectId}`, payload);
  return data;
}

export async function deleteProject(projectId: number): Promise<void> {
  await apiClient.delete(`/iaec/project/${projectId}`);
}

// -----------------------------
// IAEC PROJECT — APPROVAL FLOW
// -----------------------------

export async function approveProject(projectId: number): Promise<IAECProject> {
  const { data } = await apiClient.post<IAECProject>(`/iaec/project/${projectId}/approve`);
  return data;
}

export async function rejectProject(projectId: number, reason: string): Promise<IAECProject> {
  const { data } = await apiClient.post<IAECProject>(`/iaec/project/${projectId}/reject`, {
    reason,
  });
  return data;
}

// -----------------------------
// IAEC PROJECT — COMMENTS
// -----------------------------

export async function addProjectComment(
  projectId: number,
  comment: string
): Promise<IAECProject> {
  const { data } = await apiClient.post<IAECProject>(`/iaec/project/${projectId}/comment`, {
    comment,
  });
  return data;
}

// -----------------------------
// EXPERIMENT GROUP — FULL CRUD
// -----------------------------

export async function updateGroup(
  groupId: number,
  payload: Partial<ExperimentGroupCreate>
): Promise<ExperimentGroup> {
  const { data } = await apiClient.put<ExperimentGroup>(`/iaec/group/${groupId}`, payload);
  return data;
}

export async function deleteGroup(groupId: number): Promise<void> {
  await apiClient.delete(`/iaec/group/${groupId}`);
}

// -----------------------------
// ANIMAL EXPERIMENT — FULL CRUD
// -----------------------------

export async function updateIAECExperiment(
  experimentId: number,
  payload: Partial<AnimalExperimentCreate>
): Promise<AnimalExperiment> {
  const { data } = await apiClient.put<AnimalExperiment>(
    `/iaec/experiment/${experimentId}`,
    payload
  );
  return data;
}

export async function deleteIAECExperiment(experimentId: number): Promise<void> {
  await apiClient.delete(`/iaec/experiment/${experimentId}`);
}
