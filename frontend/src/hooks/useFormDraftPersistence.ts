import { useEffect, useRef, useState } from "react";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "../utils/formDraftStorage";

function draftsDiffer<T>(saved: T, current: T): boolean {
  return JSON.stringify(saved) !== JSON.stringify(current);
}

type UseFormDraftPersistenceOptions<T> = {
  formBId: number | null;
  stepKey: string;
  draft: T;
  hydrated: boolean;
  applyDraft: (draft: T) => void;
  /** When false, a stored draft is ignored (e.g. matches server save). */
  shouldOfferRestore?: (savedDraft: T, currentDraft: T) => boolean;
};

export function useFormDraftPersistence<T>({
  formBId,
  stepKey,
  draft,
  hydrated,
  applyDraft,
  shouldOfferRestore,
}: UseFormDraftPersistenceOptions<T>) {
  const [restoreOffer, setRestoreOffer] = useState<T | null>(null);
  const draftRef = useRef(draft);
  const restoreOfferRef = useRef(restoreOffer);
  const shouldOfferRestoreRef = useRef(shouldOfferRestore);

  useEffect(() => {
    draftRef.current = draft;
    restoreOfferRef.current = restoreOffer;
    shouldOfferRestoreRef.current = shouldOfferRestore;
  }, [draft, restoreOffer, shouldOfferRestore]);

  useEffect(() => {
    if (!formBId || !hydrated) {
      return;
    }

    const savedDraft = loadFormDraft<T>(formBId, stepKey);
    if (savedDraft == null) {
      setRestoreOffer(null);
      return;
    }
    const current = draftRef.current;
    const offerRestore = shouldOfferRestoreRef.current ?? draftsDiffer;
    if (!offerRestore(savedDraft, current)) {
      setRestoreOffer(null);
      return;
    }
    setRestoreOffer(savedDraft);
  }, [formBId, hydrated, stepKey]);

  function persistDraftIfAllowed() {
    if (!formBId || !hydrated || restoreOfferRef.current != null) {
      return;
    }
    saveFormDraft(formBId, stepKey, draftRef.current);
  }

  useEffect(() => {
    if (!formBId || !hydrated || restoreOffer != null) {
      return;
    }

    const timer = window.setTimeout(() => {
      persistDraftIfAllowed();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [formBId, stepKey, draft, hydrated, restoreOffer]);

  useEffect(() => {
    if (!formBId || !hydrated) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      persistDraftIfAllowed();
      event.preventDefault();
      event.returnValue = "";
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        persistDraftIfAllowed();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [formBId, hydrated, restoreOffer, stepKey]);

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
