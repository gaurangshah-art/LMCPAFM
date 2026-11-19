export const COLLEGE_NAME = "L. M. College of Pharmacy, Ahmedabad";
export const COLLEGE_SHORT_NAME = "LMCP";
export const SYSTEM_NAME = "LMCPAFM — Animal Facility Management";
export const SYSTEM_TAGLINE = "Animal Facility Workflow";

/** Official LMCP crest logo. Override with VITE_LMCP_LOGO_URL in .env for a custom file. */
export const COLLEGE_LOGO_URL =
  import.meta.env.VITE_LMCP_LOGO_URL?.trim() || "/lmcp-logo.png";

export function pageDocumentTitle(pageTitle: string): string {
  return `${COLLEGE_NAME} — ${pageTitle}`;
}
