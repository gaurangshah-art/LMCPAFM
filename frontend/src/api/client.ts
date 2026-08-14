import axios from "axios";
import { clearStoredSession, getStoredAccessToken, stashReturnToPath } from "../auth/session";

const defaultBaseUrl = "http://127.0.0.1:8000";

let accessToken: string | null = getStoredAccessToken();

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const requestUrl = String(originalRequest.url ?? "");
    if (requestUrl.includes("/auth/login") || requestUrl.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    clearStoredSession();
    setAccessToken(null);

    if (!window.location.pathname.startsWith("/login")) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      stashReturnToPath(returnTo);
      const params = new URLSearchParams({ expired: "1" });
      if (returnTo && !returnTo.startsWith("/login")) {
        params.set("returnTo", returnTo);
      }
      window.location.replace(`/login?${params.toString()}`);
    }

    return Promise.reject(error);
  },
);

export const apiClient = api;
