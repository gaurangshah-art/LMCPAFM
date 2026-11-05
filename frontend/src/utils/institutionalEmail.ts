const defaultDomains = "lmcp.ac.in";

export function getAllowedInstitutionalDomains(): string[] {
  const raw =
    import.meta.env.VITE_LMCP_INSTITUTIONAL_EMAIL_DOMAINS ?? defaultDomains;
  return raw
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function isLmcpInstitutionalEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex < 0) {
    return false;
  }
  const domain = normalized.slice(atIndex + 1);
  return getAllowedInstitutionalDomains().includes(domain);
}

export function institutionalEmailHint(): string {
  const domains = getAllowedInstitutionalDomains();
  if (domains.length === 1) {
    return `@${domains[0]}`;
  }
  return domains.map((domain) => `@${domain}`).join(", ");
}
