export const ACCESS_TOKEN_KEY = "lmcpafm.access-token";

const LEGACY_REFRESH_TOKEN_KEY = "lmcpafm.refresh-token";

export function getStoredAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredAccessToken(token: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function hasStoredAccessToken(): boolean {
  return Boolean(getStoredAccessToken());
}
