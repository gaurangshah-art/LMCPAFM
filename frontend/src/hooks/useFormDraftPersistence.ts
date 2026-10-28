import { useEffect, useState } from "react";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "../utils/formDraftStorage";

type UseFormDraftPersistenceOptions<T> = {
  formBId: number | null;
  stepKey: string;
  draft: T;
  hydrated: boolean;
  applyDraft: (draft: T) => void;
};

export function useFormDraftPersistence<T>({
  formBId,
  stepKey,
  draft,
  hydrated,
  applyDraft,
}: UseFormDraftPersistenceOptions<T>) {
  const [restoreOffer, setRestoreOffer] = useState<T | null>(null);

  useEffect(() => {
    if (!formBId || !hydrated) {
      return;
    }

    const savedDraft = loadFormDraft<T>(formBId, stepKey);
    if (savedDraft != null) {
      setRestoreOffer(savedDraft);
    }
  }, [formBId, stepKey, hydrated]);

  useEffect(() => {
    if (!formBId || !hydrated) {
      return;
    }

    const timer = window.setTimeout(() => {
      saveFormDraft(formBId, stepKey, draft);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [formBId, stepKey, draft, hydrated]);

  useEffect(() => {
    if (!formBId || !hydrated) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formBId, hydrated]);

  function acceptRestore() {
    if (restoreOffer == null || !formBId) {
      return;
    }
    applyDraft(restoreOffer);
    setRestoreOffer(null);
  }

  function dismissRestore() {
    if (formBId) {
      clearFormDraft(formBId, stepKey);
    }
    setRestoreOffer(null);
  }

  function clearDraft() {
    if (formBId) {
      clearFormDraft(formBId, stepKey);
    }
    setRestoreOffer(null);
  }

  return { restoreOffer, acceptRestore, dismissRestore, clearDraft };
}
