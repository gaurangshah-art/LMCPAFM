import { apiClient, setAccessToken } from "./client";
import type {
  InvestigatorRegisterRequest,
  InvestigatorRegisterResponse,
  LoginRequest,
  TokenResponse,
  User,
} from "./types";

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", payload);

  setAccessToken(data.access_token);

  return data;
}

export async function registerInvestigator(
  payload: InvestigatorRegisterRequest,
): Promise<InvestigatorRegisterResponse> {
  const { data } = await apiClient.post<InvestigatorRegisterResponse>(
    "/auth/register-investigator",
    payload,
  );
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}
