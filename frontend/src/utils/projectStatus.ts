import type { IAECProject } from "../api/types";

export function normalizeProjectStatus(status?: string | null): string {
  return (status ?? "draft").trim().toLowerCase() || "draft";
}

export function isOngoingProject(status?: string | null): boolean {
  const normalized = normalizeProjectStatus(status);
  return normalized === "draft" || normalized === "submitted" || normalized === "pending";
}

export function isApprovedProject(status?: string | null): boolean {
  return normalizeProjectStatus(status) === "approved";
}

export function isRejectedProject(status?: string | null): boolean {
  return normalizeProjectStatus(status) === "rejected";
}

export function projectStatusLabel(status?: string | null): string {
  const normalized = normalizeProjectStatus(status);
  switch (normalized) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "pending":
      return "Under IAEC review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}

export function projectStatusClass(status?: string | null): string {
  const normalized = normalizeProjectStatus(status);
  return `status-badge status-${normalized.replace(/[^a-z0-9-]/g, "-")}`;
}

/** @deprecated Prefer InvestigatorProjectSummary for dashboard views. */
export type { IAECProject };
