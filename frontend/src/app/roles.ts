import type { User } from "../api/types";

export type WorkflowRole = "investigator" | "iaec" | "staff";

const roleHome: Record<string, string> = {
  admin: "/admin-dashboard",
  iaec: "/iaec-projects",
  staff: "/allocations",
  investigator: "/",
};

export function hasRole(user: User | null, role: WorkflowRole) {
  return Boolean(user?.roles.includes(role));
}

export function hasAnyRole(user: User | null, roles: WorkflowRole[]) {
  return roles.some((role) => hasRole(user, role));
}

/** First matching home route when the user opens a URL their roles cannot use. */
export function defaultHomeForUser(user: User): string {
  const roles = new Set(user.roles);
  if (roles.has("admin")) return roleHome.admin;
  if (roles.has("iaec")) return roleHome.iaec;
  if (roles.has("staff")) return roleHome.staff;
  if (roles.has("investigator")) return roleHome.investigator;
  return "/";
}

export function canUseReturnToPath(user: User, path: string): boolean {
  const roles = new Set(user.roles);
  if (path.startsWith("/admin-dashboard") || path.startsWith("/admin/")) {
    return roles.has("admin");
  }
  if (path === "/users") {
    return roles.has("admin");
  }
  if (path.startsWith("/iaec-dashboard") || path.startsWith("/iaec/")) {
    return roles.has("iaec");
  }
  if (path.startsWith("/allocations") || path.startsWith("/facility")) {
    return roles.has("staff") || roles.has("admin");
  }
  return true;
}

