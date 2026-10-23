import { apiClient } from "./client";
import type { ActivityLog, SystemSummary, User, UserRole } from "./types";

export async function getAllUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/admin/users");
  return data;
}

export async function updateUserRoles(userId: string, roles: UserRole[]) {
  return apiClient.put<User>(`/admin/users/${userId}/roles`, { roles });
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`);
}

export async function getSystemActivityLogs(): Promise<ActivityLog[]> {
  const { data } = await apiClient.get<ActivityLog[]>("/admin/logs");
  return data;
}

export async function getSystemSummary(): Promise<SystemSummary> {
  const { data } = await apiClient.get<SystemSummary>("/admin/summary");
  return data;
}
