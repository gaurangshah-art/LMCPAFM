export const FUNDING_PROOF_REFERENCE_OPTIONS = [
  "Funding from Research Grants (GSBTM, GUJCOST, DBT, SSIP etc.)",
  "Workorder mutually signed between industry and institute",
  "Email confirmation from industry",
  "PG/ PhD Dissertation project approved by Supervisor (Cost of project does not exceed the allowance limit provided by the institution)",
] as const;

export type FundingProofReferenceOption = (typeof FUNDING_PROOF_REFERENCE_OPTIONS)[number];

export function parseFundingProofReferences(saved: unknown): string[] {
  if (Array.isArray(saved)) {
    return saved.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof saved === "string" && saved.trim()) {
    const matched = FUNDING_PROOF_REFERENCE_OPTIONS.filter((option) => saved.includes(option));
    if (matched.length) return matched;
    return saved.split(";").map((part) => part.trim()).filter(Boolean);
  }
  return [];
}
