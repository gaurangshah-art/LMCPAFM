import { useRef, useState } from "react";

export function useWizardValidation() {
  const validationRef = useRef<HTMLDivElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function showValidationError(message: string) {
    setValidationError(message);
    window.setTimeout(() => {
      validationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function clearValidationError() {
    setValidationError(null);
  }

  return {
    validationRef,
    validationError,
    setValidationError,
    showValidationError,
    clearValidationError,
  };
}
