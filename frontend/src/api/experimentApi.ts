import { apiClient } from "./client";
import type { Experiment, ExperimentCreate } from "./types";

export async function createExperiment(payload: ExperimentCreate): Promise<Experiment> {
  const { data } = await apiClient.post<Experiment>("/experiment/", payload);
  return data;
}

export async function getExperiment(experimentId: number): Promise<Experiment> {
  const { data } = await apiClient.get<Experiment>(`/experiment/${experimentId}`);
  return data;
}
