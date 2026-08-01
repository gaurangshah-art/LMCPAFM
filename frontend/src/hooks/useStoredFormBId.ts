import { useEffect, useState } from "react";
import { isFormBNotFoundError } from "../api/errors";
import {
  clearStoredFormBId,
  getFormBReview,
  readStoredFormBId,
  storeFormBId,
} from "../api/formbApi";

const STALE_FORM_B_MESSAGE =
  "Your previous Form B draft is no longer in the system. Click Start Form B to begin a new application.";

export function useStoredFormBId() {
  const [formBId, setFormBIdState] = useState<number | null>(() => readStoredFormBId());
  const [validating, setValidating] = useState(() => readStoredFormBId() != null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  useEffect(() => {
    const storedId = readStoredFormBId();
    if (!storedId) {
      setValidating(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await getFormBReview(storedId);
      } catch (error) {
        if (!cancelled && isFormBNotFoundError(error)) {
          clearStoredFormBId();
          setFormBIdState(null);
          setStaleNotice(STALE_FORM_B_MESSAGE);
        }
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function setFormBId(nextId: number | null) {
    if (nextId == null) {
      clearStoredFormBId();
      setFormBIdState(null);
      return;
    }
    storeFormBId(nextId);
    setFormBIdState(nextId);
    setStaleNotice(null);
  }

  return {
    formBId,
    setFormBId,
    validating,
    staleNotice,
    clearStaleNotice: () => setStaleNotice(null),
  };
}
