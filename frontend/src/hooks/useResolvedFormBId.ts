import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  "This Form B belongs to another account or session. Click Start Form B to begin a new application.";

function parseFormBIdParam(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function useResolvedFormBId() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = getStoredUserId();
  const startNewFormB = searchParams.get("new") === "1";
  const queryFormBId = useMemo(
    () => parseFormBIdParam(searchParams.get("formBId")),
    [searchParams],
  );
  const storedFormBId = readStoredFormBId(userId);
  const [formBId, setFormBIdState] = useState<number | null>(() => {
    if (startNewFormB) {
      clearStoredFormBId();
      return queryFormBId;
    }
    return queryFormBId ?? storedFormBId;
  });
  const [validating, setValidating] = useState(() => {
    if (startNewFormB && !queryFormBId) {
      return false;
    }
    return (queryFormBId ?? storedFormBId) != null;
  });
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [blockedQueryFormBId, setBlockedQueryFormBId] = useState<number | null>(null);

  function resetInaccessibleFormB(message: string) {
    clearStoredFormBId();
    setFormBIdState(null);
    setSubmitted(false);
    setStaleNotice(message);
    if (queryFormBId) {
      setBlockedQueryFormBId(queryFormBId);
      navigate("/form-b/step-1?new=1", { replace: true });
    }
  }

  useEffect(() => {
    if (startNewFormB) {
      clearStoredFormBId();
      setBlockedQueryFormBId(null);
      if (!queryFormBId) {
        setFormBIdState(null);
        setSubmitted(false);
        setValidating(false);
      }
    }
  }, [queryFormBId, startNewFormB]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const resolvedStoredFormBId = readStoredFormBId(userId);
    if (!queryFormBId && !startNewFormB && formBId !== resolvedStoredFormBId) {
      setFormBIdState(resolvedStoredFormBId);
    }
  }, [formBId, queryFormBId, startNewFormB, userId]);

  useEffect(() => {
    if (!queryFormBId || !userId || blockedQueryFormBId === queryFormBId) {
      return;
    }

    if (queryFormBId !== readStoredFormBId(userId)) {
      storeFormBId(queryFormBId, userId);
      setFormBIdState(queryFormBId);
    }
  }, [blockedQueryFormBId, queryFormBId, userId]);

  useEffect(() => {
    const activeId =
      blockedQueryFormBId && queryFormBId === blockedQueryFormBId
        ? null
        : queryFormBId ?? formBId;
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
          if (review.submitted) {
            clearStoredFormBId();
          }
        }
      } catch (error) {
        if (!cancelled && isFormBNotFoundError(error)) {
          resetInaccessibleFormB(STALE_FORM_B_MESSAGE);
        } else if (!cancelled && isFormBAccessDeniedError(error)) {
          resetInaccessibleFormB(INACCESSIBLE_FORM_B_MESSAGE);
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
  }, [blockedQueryFormBId, formBId, queryFormBId]);

  function setFormBId(nextId: number | null) {
    if (nextId == null) {
      clearStoredFormBId();
      setFormBIdState(null);
      setSubmitted(false);
      setBlockedQueryFormBId(null);
      return;
    }
    if (userId) {
      storeFormBId(nextId, userId);
    }
    setFormBIdState(nextId);
    setStaleNotice(null);
    setBlockedQueryFormBId(null);
  }

  const resolvedFormBId =
    blockedQueryFormBId && queryFormBId === blockedQueryFormBId ? null : queryFormBId ?? formBId;

  return {
    formBId: resolvedFormBId,
    setFormBId,
    validating,
    staleNotice,
    submitted,
    clearStaleNotice: () => setStaleNotice(null),
  };
}
