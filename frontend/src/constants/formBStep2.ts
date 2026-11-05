export const FUNDING_PROOF_REFERENCE_OPTIONS = [
  "Funding from Research Grants (GSBTM, GUJCOST, DBT, SSIP etc.)",
  "Workorder mutually signed between industry and institute",
  "Email confirmation from industry",
  "PG/ PhD Dissertation project approved by Supervisor (Cost of project does not exceed the allowance limit provided by the institution)",
] as const;

export type FundingProofReferenceOption = (typeof FUNDING_PROOF_REFERENCE_OPTIONS)[number];

const FUNDING_PROOF_REFERENCE_SET = new Set<string>(FUNDING_PROOF_REFERENCE_OPTIONS);

export function isValidFundingProofReference(value: string): value is FundingProofReferenceOption {
  return FUNDING_PROOF_REFERENCE_SET.has(value);
}

/** Keep only known checkbox options; ignore legacy free-text notes. */
export function parseFundingProofReferences(saved: unknown): string[] {
  const collected: string[] = [];

  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (typeof item === "string" && isValidFundingProofReference(item.trim())) {
        collected.push(item.trim());
      }
    }
  } else if (typeof saved === "string" && saved.trim()) {
    for (const option of FUNDING_PROOF_REFERENCE_OPTIONS) {
      if (saved.includes(option)) {
        collected.push(option);
      }
    }
    if (!collected.length) {
      for (const part of saved.split(";")) {
        const trimmed = part.trim();
        if (isValidFundingProofReference(trimmed)) {
          collected.push(trimmed);
        }
      }
    }
  }

  return [...new Set(collected)];
}
