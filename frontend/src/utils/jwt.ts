function readTokenPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1])) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenExpiryEpoch(token: string): number | null {
  const payload = readTokenPayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp : null;
}

export function getSecondsUntilExpiry(token: string): number {
  const exp = getTokenExpiryEpoch(token);
  if (exp == null) {
    return 0;
  }
  return exp - Math.floor(Date.now() / 1000);
}

export function isTokenExpired(token: string): boolean {
  return getSecondsUntilExpiry(token) <= 0;
}

export function isTokenExpiringSoon(token: string, withinSeconds = 300): boolean {
  const remaining = getSecondsUntilExpiry(token);
  return remaining > 0 && remaining <= withinSeconds;
}
