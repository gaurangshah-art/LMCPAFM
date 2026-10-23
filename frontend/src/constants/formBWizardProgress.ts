import type { FormBReviewData } from "../api/formbApi";

export type FormBWizardStepId =
  | "step-1"
  | "step-2"
  | "step-2b"
  | "step-4"
  | "step-5"
  | "step-6"
  | "step-7"
  | "review";

export interface FormBWizardStepDef {
  id: FormBWizardStepId;
  route: string;
  shortLabel: string;
  minutes: number;
  reviewKey: keyof FormBReviewData | null;
}

/** Investigator-facing order (Step 3 is filled from Step 2b — not shown separately). */
export const FORM_B_WIZARD_STEPS: FormBWizardStepDef[] = [
  {
    id: "step-1",
    route: "/form-b/step-1",
    shortLabel: "1 · PI",
    minutes: 5,
    reviewKey: "step1",
  },
  {
    id: "step-2",
    route: "/form-b/step-2",
    shortLabel: "2 · Project",
    minutes: 15,
    reviewKey: "step2",
  },
  {
    id: "step-2b",
    route: "/form-b/step-2b",
    shortLabel: "2b · Study plan",
    minutes: 45,
    reviewKey: "step2b",
  },
  {
    id: "step-4",
    route: "/form-b/step-4",
    shortLabel: "4 · Procedures",
    minutes: 20,
    reviewKey: "step4",
  },
  {
    id: "step-5",
    route: "/form-b/step-5",
    shortLabel: "5 · Housing",
    minutes: 8,
    reviewKey: "step5",
  },
  {
    id: "step-6",
    route: "/form-b/step-6",
    shortLabel: "6 · Personnel",
    minutes: 10,
    reviewKey: "step6",
  },
  {
    id: "step-7",
    route: "/form-b/step-7",
    shortLabel: "7 · Hazards",
    minutes: 12,
    reviewKey: "step7",
  },
  {
    id: "review",
    route: "/form-b/review",
    shortLabel: "Review",
    minutes: 5,
    reviewKey: null,
  },
];

export const FORM_B_WIZARD_TOTAL_MINUTES = FORM_B_WIZARD_STEPS.reduce(
  (sum, step) => sum + step.minutes,
  0,
);

function recordHasText(value: unknown, field: string): boolean {
  if (!value || typeof value !== "object") return false;
  return Boolean(String((value as Record<string, unknown>)[field] ?? "").trim());
}

export function isWizardStepSaved(
  step: FormBWizardStepDef,
  review: FormBReviewData | null | undefined,
): boolean {
  if (!review || step.reviewKey == null) {
    return false;
  }
  const payload = review[step.reviewKey];
  switch (step.reviewKey) {
    case "step1":
      return recordHasText(payload, "contact_email") && recordHasText(payload, "principal_investigator");
    case "step2":
      return recordHasText(payload, "title");
    case "step2b": {
      if (!payload || typeof payload !== "object") return false;
      const row = payload as Record<string, unknown>;
      if (row.completed === true) return true;
      return Boolean(String(row.design_rationale ?? "").trim());
    }
    case "step3":
      return Array.isArray((payload as Record<string, unknown> | null)?.requirements);
    case "step4":
      return recordHasText(payload, "procedure_description");
    case "step5":
      return recordHasText(payload, "housing_conditions");
    case "step6":
      return recordHasText(payload, "training_level");
    case "step7":
      return recordHasText(payload, "hazardous_agents_used");
    default:
      return Boolean(payload);
  }
}

export function wizardStepIndex(stepId: FormBWizardStepId): number {
  return FORM_B_WIZARD_STEPS.findIndex((step) => step.id === stepId);
}

export function estimateRemainingMinutes(currentStepId: FormBWizardStepId): number {
  const index = wizardStepIndex(currentStepId);
  if (index < 0) return FORM_B_WIZARD_TOTAL_MINUTES;
  return FORM_B_WIZARD_STEPS.slice(index).reduce((sum, step) => sum + step.minutes, 0);
}

export function formatMinutesEstimate(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `~${hours} hr`;
  return `~${hours} hr ${remainder} min`;
}

export function computeWizardProgressPercent(
  review: FormBReviewData | null | undefined,
): number {
  const scorable = FORM_B_WIZARD_STEPS.filter((step) => step.reviewKey != null);
  if (!scorable.length) return 0;
  const saved = scorable.filter((step) => isWizardStepSaved(step, review)).length;
  return Math.round((saved / scorable.length) * 100);
}
