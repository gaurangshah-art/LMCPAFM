import { apiClient, setAccessToken } from "./client";
import type { LoginRequest, TokenResponse, User } from "./types";

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", payload);

  // Store token so axios interceptor can attach Authorization header
  setAccessToken(data.access_token);

  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}
