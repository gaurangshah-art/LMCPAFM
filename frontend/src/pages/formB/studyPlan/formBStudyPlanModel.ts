import type {
  FormBGroupDosingEntry,
  FormBGroupEndpointEntry,
  FormBStudyGroupEntry,
  FormBStudyPhaseEntry,
} from "../../../api/formbApi";
import { defaultEndpoints, defaultFate } from "../../../constants/formBStudyPlan";

export const PHASE_CODES = [
  { value: "pilot", label: "Pilot" },
  { value: "main", label: "Main study" },
  { value: "pivotal", label: "Pivotal" },
  { value: "dose_finding", label: "Dose finding" },
  { value: "extension", label: "Extension" },
  { value: "other", label: "Other" },
] as const;

export const GROUP_ROLES = [
  { value: "control", label: "Control / vehicle" },
  { value: "treatment", label: "Treatment" },
  { value: "sham", label: "Sham" },
  { value: "other", label: "Other" },
] as const;

export function emptyDosing(): FormBGroupDosingEntry {
  return {
    agent_name: "",
    dose: "",
    route: "",
    frequency: "",
    duration: "",
  };
}

function toOptionalNumericId(value: number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function emptyGroup(animalCount = 6): FormBStudyGroupEntry {
  return {
    group_code: "G1",
    group_name: "Group 1",
    role: "control",
    animal_count: animalCount,
    species_id: null,
    strain_id: null,
    species_other: null,
    strain_other: null,
    sex: "Both",
    age: "8-10 weeks",
    weight_range: "200-250 g",
    feeding_diet: "Standard pellet diet",
    housing_notes: "",
    treatment_summary: "",
    dosing: [emptyDosing()],
    fates: defaultFate(animalCount),
  };
}

export function emptyPhase(order = 1): FormBStudyPhaseEntry {
  const groups = [emptyGroup(6)];
  return {
    phase_code: order === 1 ? "pilot" : "main",
    phase_name: order === 1 ? "Phase 1" : `Phase ${order}`,
    sequence_order: order,
    objective: "",
    planned_start_date: null,
    planned_duration_weeks: 4,
    animal_cap: groups.reduce((sum, group) => sum + group.animal_count, 0),
    contingency_note: "",
    depends_on_sequence_order: null,
    reuse_animals_allowed: false,
    endpoints: defaultEndpoints(),
    blood_withdrawal_volume: "Not applicable",
    blood_withdrawal_site: "Not applicable",
    surgical_procedure: "None",
    groups,
  };
}

export function normalizeStudyPlanPhases(data: FormBStudyPhaseEntry[] | undefined): FormBStudyPhaseEntry[] {
  if (!data?.length) return [emptyPhase(1)];
  return data.map((phase, index) => {
    const legacyGroupEndpoints = phase.groups.find(
      (group) => (group as FormBStudyGroupEntry & { endpoints?: FormBGroupEndpointEntry[] }).endpoints?.length,
    ) as (FormBStudyGroupEntry & { endpoints?: FormBGroupEndpointEntry[] }) | undefined;
    const groups = phase.groups.map((group) => ({
      ...group,
      species_id: toOptionalNumericId(group.species_id),
      strain_id: toOptionalNumericId(group.strain_id),
      dosing: group.dosing?.length
        ? group.dosing.map((dose) => ({ ...emptyDosing(), ...dose, duration: dose.duration ?? "" }))
        : [emptyDosing()],
      fates: group.fates?.length ? group.fates : defaultFate(group.animal_count),
    }));
    const endpoints = phase.endpoints?.length
      ? phase.endpoints
      : legacyGroupEndpoints?.endpoints?.length
        ? legacyGroupEndpoints.endpoints
        : defaultEndpoints();
    const animalCap = groups.reduce((sum, group) => sum + group.animal_count, 0);
    return {
      ...phase,
      sequence_order: phase.sequence_order || index + 1,
      animal_cap: animalCap,
      endpoints,
      groups,
    };
  });
}

export function syncPhaseCap(phase: FormBStudyPhaseEntry): FormBStudyPhaseEntry {
  const animalCap = phase.groups.reduce((sum, group) => sum + group.animal_count, 0);
  return { ...phase, animal_cap: animalCap };
}
