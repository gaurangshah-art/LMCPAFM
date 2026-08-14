import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isFormBNotFoundError } from "../api/errors";
import {
  clearStoredFormBId,
  getFormBReview,
  readStoredFormBId,
  storeFormBId,
} from "../api/formbApi";

const STALE_FORM_B_MESSAGE =
  "Your previous Form B draft is no longer in the system. Click Start Form B to begin a new application.";

function parseFormBIdParam(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function useResolvedFormBId() {
  const [searchParams] = useSearchParams();
  const queryFormBId = useMemo(
    () => parseFormBIdParam(searchParams.get("formBId")),
    [searchParams],
  );
  const [formBId, setFormBIdState] = useState<number | null>(
    () => queryFormBId ?? readStoredFormBId(),
  );
  const [validating, setValidating] = useState(() => (queryFormBId ?? readStoredFormBId()) != null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (queryFormBId && queryFormBId !== readStoredFormBId()) {
      storeFormBId(queryFormBId);
      setFormBIdState(queryFormBId);
    }
  }, [queryFormBId]);

  useEffect(() => {
    const activeId = queryFormBId ?? formBId;
    if (!activeId) {
      setValidating(false);
      setSubmitted(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const review = await getFormBReview(activeId);
        if (!cancelled) {
          setSubmitted(Boolean(review.submitted));
        }
      } catch (error) {
        if (!cancelled && isFormBNotFoundError(error)) {
          clearStoredFormBId();
          setFormBIdState(null);
          setSubmitted(false);
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
  }, [queryFormBId, formBId]);

  function setFormBId(nextId: number | null) {
    if (nextId == null) {
      clearStoredFormBId();
      setFormBIdState(null);
      setSubmitted(false);
      return;
    }
    storeFormBId(nextId);
    setFormBIdState(nextId);
    setStaleNotice(null);
  }

  return {
    formBId: queryFormBId ?? formBId,
    setFormBId,
    validating,
    staleNotice,
    submitted,
    clearStaleNotice: () => setStaleNotice(null),
  };
}
