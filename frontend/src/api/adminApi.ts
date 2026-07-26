import { apiClient } from "./client";

export async function getAllUsers() {
  return apiClient.get("/admin/users");
}

export async function updateUserRoles(userId: string, roles: string[]) {
  return apiClient.put(`/admin/users/${userId}/roles`, { roles });
}

export async function getSystemActivityLogs() {
  return apiClient.get("/admin/logs");
}

export async function getSystemSummary() {
  return apiClient.get("/admin/summary");
}
