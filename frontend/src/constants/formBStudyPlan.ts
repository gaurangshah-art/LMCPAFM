import type {
  FormBGroupEndpointEntry,
  FormBGroupFateEntry,
  FormBStudyPhaseEntry,
} from "../api/formbApi";

export const ENDPOINT_SCHEDULE_TYPES = [
  { value: "single", label: "One-time" },
  { value: "recurring", label: "Recurring" },
  { value: "window", label: "Time window" },
] as const;

export const FATE_TYPE_OPTIONS = [
  { value: "sacrifice", label: "Sacrificed" },
  { value: "euthanasia", label: "Euthanized" },
  { value: "rehabilitation", label: "Rehabilitated" },
  { value: "reuse", label: "Reused" },
  { value: "other", label: "Other" },
] as const;

export interface FormBAnimalSummary {
  totalUsed: number;
  sacrificed: number;
  rehabilitated: number;
  reused: number;
  other: number;
}

export function slugParameterCode(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
  return slug || "parameter";
}

export function emptyEndpoint(): FormBGroupEndpointEntry {
  return {
    parameter_code: "",
    parameter_name: "",
    schedule_type: "recurring",
    schedule_detail: "",
    method: "",
    notes: "",
  };
}

export function defaultEndpoints(): FormBGroupEndpointEntry[] {
  return [emptyEndpoint()];
}

export function defaultFate(count: number): FormBGroupFateEntry[] {
  return [
    {
      fate_type: "sacrifice",
      count,
      method_or_destination: "As per IAEC-approved protocol",
      timing: "End of phase",
    },
  ];
}

export function computeAnimalSummary(phases: FormBStudyPhaseEntry[]): FormBAnimalSummary {
  let totalUsed = 0;
  let sacrificed = 0;
  let rehabilitated = 0;
  let reused = 0;
  let other = 0;

  for (const phase of phases) {
    for (const group of phase.groups) {
      totalUsed += group.animal_count;
      for (const fate of group.fates) {
        if (fate.fate_type === "sacrifice" || fate.fate_type === "euthanasia") {
          sacrificed += fate.count;
        } else if (fate.fate_type === "rehabilitation") {
          rehabilitated += fate.count;
        } else if (fate.fate_type === "reuse") {
          reused += fate.count;
        } else if (fate.fate_type === "other") {
          other += fate.count;
        }
      }
    }
  }

  return { totalUsed, sacrificed, rehabilitated, reused, other };
}

export function buildStudyPlanPayloadPhases(
  sourcePhases: FormBStudyPhaseEntry[],
  syncPhaseCap: (phase: FormBStudyPhaseEntry) => FormBStudyPhaseEntry,
): FormBStudyPhaseEntry[] {
  return sourcePhases.map((phase) =>
    syncPhaseCap({
      ...phase,
      endpoints: phase.endpoints.map((endpoint) => ({
        ...endpoint,
        parameter_code:
          endpoint.parameter_code.trim() || slugParameterCode(endpoint.parameter_name),
        parameter_name: endpoint.parameter_name.trim(),
        schedule_detail: endpoint.schedule_detail.trim(),
        method: endpoint.method?.trim() || null,
        notes: endpoint.notes?.trim() || null,
      })),
      groups: phase.groups.map((group) => ({
        ...group,
        dosing:
          group.role === "control" && !group.dosing[0]?.agent_name.trim()
            ? []
            : group.dosing.slice(0, 1),
        fates: group.fates.map((fate) => ({
          ...fate,
          method_or_destination: fate.method_or_destination?.trim() || null,
          timing: fate.timing?.trim() || null,
        })),
      })),
    }),
  );
}
