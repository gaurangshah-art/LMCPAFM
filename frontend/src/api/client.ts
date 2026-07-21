import axios from "axios";

const defaultBaseUrl = "http://127.0.0.1:8000";

// In‑memory access token
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Refresh token logic
let isRefreshing = false;
let refreshQueue: ((token: string) => void)[] = [];

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // If access token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = window.localStorage.getItem("lmcpafm.refresh-token");

      // No refresh token → force logout
      if (!refreshToken) {
        window.localStorage.removeItem("lmcpafm.access-token");
        window.location.replace("/login?expired=1");
        return Promise.reject(error);
      }

      // Start refresh if not already refreshing
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          const newAccessToken = res.data.access_token;

          // Save new access token
          window.localStorage.setItem("lmcpafm.access-token", newAccessToken);
          setAccessToken(newAccessToken);

          // Resolve queued requests
          refreshQueue.forEach((cb) => cb(newAccessToken));
          refreshQueue = [];
        } catch (refreshError) {
          // Refresh failed → logout
          window.localStorage.removeItem("lmcpafm.access-token");
          window.localStorage.removeItem("lmcpafm.refresh-token");
          window.location.replace("/login?expired=1");
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Queue requests while refreshing
      return new Promise((resolve) => {
        refreshQueue.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

// ⭐ ADD THIS — the missing export that your other files expect
export const apiClient = api;
