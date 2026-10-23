import type { FormBStudyGroupEntry, FormBStudyPhaseEntry } from "../api/formbApi";

export interface FormBProjectSpeciesStrain {
  enabled: boolean;
  species_id: number | null;
  strain_id: number | null;
  species_other: string | null;
  strain_other: string | null;
}

export function createDefaultProjectSpeciesStrain(): FormBProjectSpeciesStrain {
  return {
    enabled: true,
    species_id: null,
    strain_id: null,
    species_other: null,
    strain_other: null,
  };
}

export function speciesStrainKey(group: {
  species_id?: number | null;
  strain_id?: number | null;
  species_other?: string | null;
  strain_other?: string | null;
}): string {
  if ((group.species_other ?? "").trim()) {
    return `other:${(group.species_other ?? "").trim().toLowerCase()}|${(group.strain_other ?? "").trim().toLowerCase()}`;
  }
  return `id:${group.species_id ?? ""}|${group.strain_id ?? ""}|${(group.strain_other ?? "").trim().toLowerCase()}`;
}

export function detectUniformProjectSpeciesStrain(
  phases: FormBStudyPhaseEntry[],
): Omit<FormBProjectSpeciesStrain, "enabled"> | null {
  let sample: FormBStudyGroupEntry | null = null;
  for (const phase of phases) {
    for (const group of phase.groups) {
      const hasSpecies =
        group.species_id != null ||
        Boolean((group.species_other ?? "").trim());
      if (!hasSpecies) continue;
      if (!sample) {
        sample = group;
        continue;
      }
      if (speciesStrainKey(group) !== speciesStrainKey(sample)) {
        return null;
      }
    }
  }
  if (!sample) return null;
  return {
    species_id: sample.species_id ?? null,
    strain_id: sample.strain_id ?? null,
    species_other: sample.species_other ?? null,
    strain_other: sample.strain_other ?? null,
  };
}

export function applyProjectSpeciesStrainToGroup(
  group: FormBStudyGroupEntry,
  project: FormBProjectSpeciesStrain,
): FormBStudyGroupEntry {
  if (!project.enabled) return group;
  return {
    ...group,
    species_id: project.species_id,
    strain_id: project.strain_id,
    species_other: project.species_other,
    strain_other: project.strain_other,
  };
}

export function applyProjectSpeciesStrainToPhases(
  phases: FormBStudyPhaseEntry[],
  project: FormBProjectSpeciesStrain,
): FormBStudyPhaseEntry[] {
  if (!project.enabled) return phases;
  return phases.map((phase) => ({
    ...phase,
    groups: phase.groups.map((group) => applyProjectSpeciesStrainToGroup(group, project)),
  }));
}

export function parseProjectSpeciesStrain(raw: unknown): FormBProjectSpeciesStrain {
  const defaults = createDefaultProjectSpeciesStrain();
  if (!raw || typeof raw !== "object") return defaults;
  const row = raw as Record<string, unknown>;
  return {
    enabled: row.enabled !== false,
    species_id: row.species_id != null ? Number(row.species_id) : null,
    strain_id: row.strain_id != null ? Number(row.strain_id) : null,
    species_other: row.species_other != null ? String(row.species_other) : null,
    strain_other: row.strain_other != null ? String(row.strain_other) : null,
  };
}

export function formatProjectSpeciesStrainLabel(
  project: FormBProjectSpeciesStrain,
  speciesOptions: { id: number; name: string }[],
  strainsForSpecies: (speciesId: number | null | undefined) => { id: number; name: string }[],
): string {
  if ((project.species_other ?? "").trim()) {
    return `${project.species_other} / ${project.strain_other ?? ""}`.trim();
  }
  const speciesName = speciesOptions.find((row) => row.id === project.species_id)?.name ?? "";
  const strainName =
    (project.strain_other ?? "").trim() ||
    strainsForSpecies(project.species_id).find((row) => row.id === project.strain_id)?.name ||
    "";
  if (!speciesName) return "Not set yet";
  return strainName ? `${speciesName} / ${strainName}` : speciesName;
}

export function serializeProjectSpeciesStrain(project: FormBProjectSpeciesStrain) {
  return {
    enabled: project.enabled,
    species_id: project.species_id,
    strain_id: project.strain_id,
    species_other: (project.species_other ?? "").trim() || null,
    strain_other: (project.strain_other ?? "").trim() || null,
  };
}
