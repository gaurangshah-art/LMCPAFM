export type FormBStudyPlanHazardChoice = "" | "none" | "yes";

export interface FormBStudyPlanHazardProfile {
  uses_special_hazards: "none" | "yes";
}

export function parseStudyPlanHazardProfile(raw: unknown): FormBStudyPlanHazardChoice {
  if (!raw || typeof raw !== "object") {
    return "";
  }
  const value = String((raw as Record<string, unknown>).uses_special_hazards ?? "");
  if (value === "none" || value === "yes") {
    return value;
  }
  return "";
}

export function serializeStudyPlanHazardProfile(
  choice: FormBStudyPlanHazardChoice,
): FormBStudyPlanHazardProfile | undefined {
  if (choice !== "none" && choice !== "yes") {
    return undefined;
  }
  return { uses_special_hazards: choice };
}
