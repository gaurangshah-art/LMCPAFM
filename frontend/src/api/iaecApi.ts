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
