export const ACCESS_TOKEN_KEY = "lmcpafm.access-token";
export const RETURN_TO_KEY = "lmcpafm.return-to";

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

export function stashReturnToPath(path: string): void {
  if (!path || path.startsWith("/login")) {
    return;
  }
  window.sessionStorage.setItem(RETURN_TO_KEY, path);
}

export function readReturnToPath(search = window.location.search): string | null {
  const fromQuery = new URLSearchParams(search).get("returnTo");
  const fromStorage = window.sessionStorage.getItem(RETURN_TO_KEY);
  const path = fromQuery || fromStorage;
  if (!path || path.startsWith("/login")) {
    return null;
  }
  return path;
}

export function clearReturnToPath(): void {
  window.sessionStorage.removeItem(RETURN_TO_KEY);
}

export function hasStoredAccessToken(): boolean {
  return Boolean(getStoredAccessToken());
}
