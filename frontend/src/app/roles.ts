import type { User } from "../../api/types";

export type WorkflowRole = "investigator" | "iaec" | "staff";

export function hasRole(user: User | null, role: WorkflowRole) {
	return Boolean(user?.roles.includes(role));
}

export function hasAnyRole(user: User | null, roles: WorkflowRole[]) {
	return roles.some((role) => hasRole(user, role));
}
