import type { UserRole } from "../api/types";

/** Roles that admins/staff can assign when creating or editing institutional accounts. */
export const ASSIGNABLE_ADMIN_ROLES = ["admin", "iaec", "staff", "investigator"] as const;

export type AssignableAdminRole = (typeof ASSIGNABLE_ADMIN_ROLES)[number];

export function isAssignableAdminRole(role: string): role is AssignableAdminRole {
  return (ASSIGNABLE_ADMIN_ROLES as readonly string[]).includes(role);
}

export function userHasInvestigatorRole(roles: UserRole[]): boolean {
  return roles.includes("investigator");
}

/** Investigators who may use Requisitions / Allocations in the app. */
export function userHasRequisitionAccess(user: {
  roles: UserRole[];
  is_certified_animal_handler?: boolean;
}): boolean {
  return userHasInvestigatorRole(user.roles) && Boolean(user.is_certified_animal_handler);
}

export function assignableRolesFromUser(roles: UserRole[]): AssignableAdminRole[] {
  return roles.filter(isAssignableAdminRole);
}
