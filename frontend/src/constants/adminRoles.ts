import type { UserRole } from "../api/types";

/** Roles that admins/staff can assign when creating or editing institutional accounts. */
export const ASSIGNABLE_ADMIN_ROLES = ["admin", "iaec", "staff"] as const;

export type AssignableAdminRole = (typeof ASSIGNABLE_ADMIN_ROLES)[number];

export function isAssignableAdminRole(role: string): role is AssignableAdminRole {
  return (ASSIGNABLE_ADMIN_ROLES as readonly string[]).includes(role);
}

export function userHasInvestigatorRole(roles: UserRole[]): boolean {
  return roles.includes("investigator");
}

export function assignableRolesFromUser(roles: UserRole[]): AssignableAdminRole[] {
  return roles.filter(isAssignableAdminRole);
}
