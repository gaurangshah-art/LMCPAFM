import { apiClient } from "./client";

export interface SpeciesRecord {
  id: number;
  name: string;
}

export interface StrainRecord {
  id: number;
  species_id: number;
  name: string;
  species_name?: string | null;
}

export async function getMasterSpecies(): Promise<SpeciesRecord[]> {
  const { data } = await apiClient.get<SpeciesRecord[]>("/admin/masters/species");
  return data;
}

export async function createMasterSpecies(name: string): Promise<SpeciesRecord> {
  const { data } = await apiClient.post<SpeciesRecord>("/admin/masters/species", { name });
  return data;
}

export async function updateMasterSpecies(id: number, name: string): Promise<SpeciesRecord> {
  const { data } = await apiClient.put<SpeciesRecord>(`/admin/masters/species/${id}`, { name });
  return data;
}

export async function deleteMasterSpecies(id: number): Promise<void> {
  await apiClient.delete(`/admin/masters/species/${id}`);
}

export async function getMasterStrains(speciesId?: number): Promise<StrainRecord[]> {
  const { data } = await apiClient.get<StrainRecord[]>("/admin/masters/strains", {
    params: speciesId ? { species_id: speciesId } : undefined,
  });
  return data;
}

export async function createMasterStrain(speciesId: number, name: string): Promise<StrainRecord> {
  const { data } = await apiClient.post<StrainRecord>("/admin/masters/strains", {
    species_id: speciesId,
    name,
  });
  return data;
}

export async function updateMasterStrain(id: number, name: string): Promise<StrainRecord> {
  const { data } = await apiClient.put<StrainRecord>(`/admin/masters/strains/${id}`, { name });
  return data;
}

export async function deleteMasterStrain(id: number): Promise<void> {
  await apiClient.delete(`/admin/masters/strains/${id}`);
}
