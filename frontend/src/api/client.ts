import axios from "axios";

const defaultBaseUrl = "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
