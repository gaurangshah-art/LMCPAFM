const DRAFT_PREFIX = "lmcpafm.form-draft.";
const DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function draftKey(formBId: number, stepKey: string): string {
  return `${DRAFT_PREFIX}${formBId}.${stepKey}`;
}

type StoredDraft = {
  savedAt: number;
  draft: unknown;
};

function readStoredDraft(formBId: number, stepKey: string): StoredDraft | null {
  const key = draftKey(formBId, stepKey);
  try {
    const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed || typeof parsed.savedAt !== "number") {
      return null;
    }
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
      return null;
    }
    if (window.localStorage.getItem(key) == null && window.sessionStorage.getItem(key) != null) {
      window.localStorage.setItem(key, raw);
      window.sessionStorage.removeItem(key);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveFormDraft(formBId: number, stepKey: string, draft: unknown): void {
  const key = draftKey(formBId, stepKey);
  const payload = JSON.stringify({ savedAt: Date.now(), draft });
  try {
    window.localStorage.setItem(key, payload);
    window.sessionStorage.removeItem(key);
  } catch {
    try {
      window.sessionStorage.setItem(key, payload);
    } catch {
      // Ignore quota or private-mode storage errors.
    }
  }
}

export function loadFormDraft<T>(formBId: number, stepKey: string): T | null {
  const stored = readStoredDraft(formBId, stepKey);
  return (stored?.draft as T | undefined) ?? null;
}

export function loadFormDraftSavedAt(formBId: number, stepKey: string): number | null {
  return readStoredDraft(formBId, stepKey)?.savedAt ?? null;
}

export function clearFormDraft(formBId: number, stepKey: string): void {
  const key = draftKey(formBId, stepKey);
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}
