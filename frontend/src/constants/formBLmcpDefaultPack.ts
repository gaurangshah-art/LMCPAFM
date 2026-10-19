import { getFormBStudyPlan } from "../api/formbApi";
import { INSTITUTIONAL_DEFAULTS } from "./institution";

/** Step 4 — baseline for typical in-house rat/mouse pharmacology (edit procedure & pain category). */
export const LMCP_DEFAULT_PACK_STEP4 = {
  survivalSurgery: "No",
  prohibitAnalgesicAnesthetic: "No",
  prohibitAnalgesicJustification: "",
  euthanasiaMethod: "CO₂ chamber",
  radiationDosageSchedule: "Not applicable",
  repeatSurgeryJustification: "",
  alternativesConsidered:
    "In vitro and literature alternatives were considered, including cell-based assays and published " +
    "in vivo models. An animal model is required to evaluate the biological endpoints defined in the " +
    "study plan under IAEC-approved conditions at LMCP.",
  rationale3Rs:
    "Replacement: non-animal and literature evidence used where possible. Reduction: group sizes follow " +
    "the study plan totals with no unnecessary duplication. Refinement: animals will be housed and handled " +
    "per institutional SOP with appropriate analgesia/anaesthesia when procedures exceed minor pain.",
} as const;

/** Step 5 — standard LMCP animal house husbandry. */
export const LMCP_DEFAULT_PACK_STEP5 = {
  housingConditions: "Individually ventilated cages (IVC)",
  specialRequirements: "None beyond institutional animal house SOP.",
  feeding: "Standard pellet diet",
  environmentalEnrichment: "Nesting material",
  animalTransportationMethods:
    "Not applicable — animals maintained in the Institutional Animal House; " +
    "no extra-institutional transport envisaged.",
  scopeForReuse: "None — animals will not be reused outside this protocol.",
  rehabilitationDetails: "Not applicable.",
  carcassDisposalMethod:
    "Carcasses disposed as per institutional biomedical waste SOP following IAEC-approved euthanasia " +
    `at ${INSTITUTIONAL_DEFAULTS.animalHousingLocation}.`,
} as const;

/** Step 6 — training defaults (personnel row filled from Step 1 when available). */
export const LMCP_DEFAULT_PACK_STEP6 = {
  trainingLevel: "CPCSEA training",
  competencyCertification: "Certified by Institutional Committee",
  trainingDetails:
    "Personnel have completed LMCP animal house orientation, species-specific handling, and CPCSEA/institutional " +
    "training as applicable to the procedures in this protocol. Records maintained with the animal facility.",
} as const;

export function mergeFillEmpty<T extends Record<string, unknown>>(
  current: T,
  defaults: Partial<T>,
): T {
  const next = { ...current };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const value = defaults[key];
    const existing = next[key];
    if (typeof existing === "string") {
      if (!existing.trim() && typeof value === "string" && value.trim()) {
        next[key] = value as T[keyof T];
      }
    } else if (existing == null || existing === "") {
      next[key] = value as T[keyof T];
    }
  }
  return next;
}

export async function fetchStep4DefaultPackExtras(formBId: number): Promise<{
  bloodWithdrawalVolumes?: string;
  bloodWithdrawalSites?: string;
}> {
  try {
    const plan = await getFormBStudyPlan(formBId);
    for (const phase of plan.phases ?? []) {
      const volume = (phase.blood_withdrawal_volume ?? "").trim();
      const site = (phase.blood_withdrawal_site ?? "").trim();
      if (volume || site) {
        return {
          bloodWithdrawalVolumes: volume || "Not applicable",
          bloodWithdrawalSites: site || "Not applicable",
        };
      }
    }
  } catch {
    /* study plan may not exist yet */
  }
  return {
    bloodWithdrawalVolumes: "Not applicable",
    bloodWithdrawalSites: "Not applicable",
  };
}

export function buildPersonnelDefaultFromStep1(
  step1: Record<string, unknown> | null | undefined,
): {
  name: string;
  designation: string;
  department: string;
  telephone: string;
  email: string;
  experience: string;
} {
  return {
    name: String(step1?.principal_investigator ?? "").trim(),
    designation: String(step1?.designation ?? "").trim(),
    department: String(step1?.department ?? "").trim(),
    telephone: String(step1?.contact_phone ?? "").trim(),
    email: String(step1?.contact_email ?? "").trim(),
    experience: String(step1?.experience ?? "").trim(),
  };
}
