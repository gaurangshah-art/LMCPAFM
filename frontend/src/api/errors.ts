import axios from "axios";
import type { ApiErrorResponse } from "./types";

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (error.code === "ERR_NETWORK") {
      return "Network error — check that the backend is running and reachable.";
    }
    if (error.code === "ECONNABORTED") {
      return "Request timed out. If uploading a file, try a smaller file; otherwise wait and retry.";
    }

    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            const loc = Array.isArray((item as { loc?: unknown }).loc)
              ? (item as { loc: unknown[] }).loc.filter((part) => part !== "body").join(" → ")
              : "";
            const msg = String((item as { msg: unknown }).msg);
            return loc ? `${loc}: ${msg}` : msg;
          }
          return JSON.stringify(item);
        })
        .filter(Boolean);
      if (messages.length) {
        return messages.join(" ");
      }
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}

export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function isFormBNotFoundError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  if (error.response?.status === 404) {
    return true;
  }
  const detail = error.response?.data?.detail;
  return typeof detail === "string" && detail.toLowerCase().includes("form b not found");
}

export function isFormBAccessDeniedError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const detail = error.response?.data?.detail;
  if (typeof detail !== "string") {
    return false;
  }
  const normalized = detail.toLowerCase();
  return (
    normalized.includes("not allowed to access this form b") ||
    normalized.includes("do not have permission to view this form b") ||
    normalized.includes("do not have permission to edit this form b")
  );
}

export function isRecoverableStoredFormBError(error: unknown): boolean {
  return isFormBNotFoundError(error) || isFormBAccessDeniedError(error);
}
