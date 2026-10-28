export const FORM_B_ID_STORAGE_KEY = "form_b_id";

interface StoredFormBRecord {
  userId: number;
  formBId: number;
}

function isStoredFormBRecord(value: unknown): value is StoredFormBRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as StoredFormBRecord;
  return (
    Number.isFinite(record.userId) &&
    record.userId > 0 &&
    Number.isFinite(record.formBId) &&
    record.formBId > 0
  );
}

export function storeFormBId(formBId: number, userId: number): void {
  const record: StoredFormBRecord = { userId, formBId };
  localStorage.setItem(FORM_B_ID_STORAGE_KEY, JSON.stringify(record));
}

export function readStoredFormBId(userId: number | null | undefined): number | null {
  if (userId == null) {
    return null;
  }

  const raw = localStorage.getItem(FORM_B_ID_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredFormBRecord(parsed)) {
      clearStoredFormBId();
      return null;
    }
    if (parsed.userId !== userId) {
      clearStoredFormBId();
      return null;
    }
    return parsed.formBId;
  } catch {
    // Legacy plain-number entries are not tied to a user; discard them.
    clearStoredFormBId();
    return null;
  }
}

export function clearStoredFormBId(): void {
  localStorage.removeItem(FORM_B_ID_STORAGE_KEY);
}
