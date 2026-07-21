import { apiClient } from "./client";
import type { User, UserCreate } from "./types";

export async function listUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/users/");
  return data;
}

export async function createUser(payload: UserCreate): Promise<User> {
  const { data } = await apiClient.post<User>("/users/", payload);
  return data;
}