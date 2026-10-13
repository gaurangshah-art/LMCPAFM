const DRAFT_PREFIX = "lmcpafm.form-draft.";

function draftKey(formBId: number, stepKey: string): string {
  return `${DRAFT_PREFIX}${formBId}.${stepKey}`;
}

export function saveFormDraft(formBId: number, stepKey: string, draft: unknown): void {
  try {
    window.sessionStorage.setItem(
      draftKey(formBId, stepKey),
      JSON.stringify({ savedAt: Date.now(), draft }),
    );
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

export function loadFormDraft<T>(formBId: number, stepKey: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey(formBId, stepKey));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { draft?: T };
    return parsed.draft ?? null;
  } catch {
    return null;
  }
}

export function clearFormDraft(formBId: number, stepKey: string): void {
  window.sessionStorage.removeItem(draftKey(formBId, stepKey));
}
