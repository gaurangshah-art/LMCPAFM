import axios from "axios";
import type { ApiErrorResponse } from "./types";

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (error.code === "ERR_NETWORK") {
      return "Network error — check that the backend is running and reachable.";
    }
    if (error.code === "ECONNABORTED") {
      return "Request timed out. Try again with a smaller file.";
    }

    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail.map((item) => JSON.stringify(item)).join("; ");
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}
