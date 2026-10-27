import { apiClient, setAccessToken } from "./client";
import { setStoredAccessToken } from "../auth/session";
import type {
  ChangePasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
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

export async function refreshSession(): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/refresh");
  setAccessToken(data.access_token);
  setStoredAccessToken(data.access_token);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}

export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  await apiClient.post("/auth/change-password", payload);
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  const { data } = await apiClient.post<ForgotPasswordResponse>("/auth/forgot-password", {
    email,
  });
  return data;
}

export async function resetPasswordWithToken(payload: ResetPasswordRequest): Promise<void> {
  await apiClient.post("/auth/reset-password", payload);
}
