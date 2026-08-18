import { useEffect, useState } from "react";
import { isFormBAccessDeniedError, isFormBNotFoundError } from "../api/errors";
import {
  clearStoredFormBId,
  getFormBReview,
  readStoredFormBId,
  storeFormBId,
} from "../api/formbApi";
import { getStoredUserId } from "../auth/session";

const STALE_FORM_B_MESSAGE =
  "Your previous Form B draft is no longer in the system. Click Start Form B to begin a new application.";

const INACCESSIBLE_FORM_B_MESSAGE =
  "A saved Form B from another session could not be opened. Click Start Form B to begin a new application.";

export function useStoredFormBId() {
  const userId = getStoredUserId();
  const [formBId, setFormBIdState] = useState<number | null>(() => readStoredFormBId(userId));
  const [validating, setValidating] = useState(() => readStoredFormBId(userId) != null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  useEffect(() => {
    const storedId = readStoredFormBId(userId);
    if (!storedId) {
      setFormBIdState(null);
      setValidating(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const review = await getFormBReview(storedId);
        if (!cancelled && review.submitted) {
          clearStoredFormBId();
          setFormBIdState(null);
        }
      } catch (error) {
        if (!cancelled && isFormBNotFoundError(error)) {
          clearStoredFormBId();
          setFormBIdState(null);
          setStaleNotice(STALE_FORM_B_MESSAGE);
        } else if (!cancelled && isFormBAccessDeniedError(error)) {
          clearStoredFormBId();
          setFormBIdState(null);
          setStaleNotice(INACCESSIBLE_FORM_B_MESSAGE);
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
  }, [userId]);

  function setFormBId(nextId: number | null) {
    if (nextId == null) {
      clearStoredFormBId();
      setFormBIdState(null);
      return;
    }
    if (userId) {
      storeFormBId(nextId, userId);
    }
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
