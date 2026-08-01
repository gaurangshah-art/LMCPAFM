import { useEffect, useState } from "react";
import { getApiErrorMessage, isFormBNotFoundError } from "../api/errors";
import {
  clearStoredFormBId,
  getFormBReview,
  type FormBReviewData,
} from "../api/formbApi";

type StepKey = keyof Pick<
  FormBReviewData,
  "step1" | "step2" | "step3" | "step4" | "step5" | "step6" | "step7"
>;

export function useFormBStepReview<T>(
  formBId: number | null,
  stepKey: StepKey,
  mapSaved: (saved: Record<string, unknown> | null | undefined) => T,
  initialValue: T,
) {
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(Boolean(formBId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!formBId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const review = await getFormBReview(formBId);
        if (!cancelled) {
          setValue(mapSaved(review[stepKey] as Record<string, unknown> | null | undefined));
        }
      } catch (error) {
        if (!cancelled) {
          if (isFormBNotFoundError(error)) {
            clearStoredFormBId();
            setErrorMessage(
              "Your saved Form B draft is no longer available. Return to Step 1 and click Start Form B.",
            );
          } else {
            setErrorMessage(getApiErrorMessage(error));
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formBId, stepKey]);

  return { value, setValue, loading, errorMessage };
}

export function readString(data: Record<string, unknown> | null | undefined, key: string) {
  return data?.[key] != null ? String(data[key]) : "";
}

export function readNumber(data: Record<string, unknown> | null | undefined, key: string) {
  const raw = data?.[key];
  if (raw == null || raw === "") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function readBoolean(data: Record<string, unknown> | null | undefined, key: string) {
  return Boolean(data?.[key]);
}
