import axios from "axios";
import type { ApiErrorResponse } from "./types";

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.detail ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}
