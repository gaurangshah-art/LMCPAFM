import axios from "../utils/axios";

export const getAllUsers = () =>
  axios.get("/admin/users");

export const updateUserRoles = (userId: string, roles: string[]) =>
  axios.put(`/admin/users/${userId}/roles`, { roles });

export const getSystemActivityLogs = () =>
  axios.get("/admin/logs");

export const getSystemSummary = () =>
  axios.get("/admin/summary");
