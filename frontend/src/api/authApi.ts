import axios from "axios";
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
    { ...payload, account_type: payload.account_type ?? "faculty" },
  );
  return data;
}

export async function registerStudentScholar(
  payload: Omit<InvestigatorRegisterRequest, "account_type">,
): Promise<InvestigatorRegisterResponse> {
  const body = { ...payload, account_type: "student" as const };
  try {
    const { data } = await apiClient.post<InvestigatorRegisterResponse>(
      "/auth/register-student",
      body,
    );
    return data;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      throw error;
    }
    const { data } = await apiClient.post<InvestigatorRegisterResponse>(
      "/auth/register-investigator",
      body,
    );
    return data;
  }
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
