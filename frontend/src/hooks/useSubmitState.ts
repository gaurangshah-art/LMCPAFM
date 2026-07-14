import { useState } from "react";

export function useSubmitState() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function start() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function fail(message: string) {
    setIsSubmitting(false);
    setErrorMessage(message);
  }

  function succeed(message: string) {
    setIsSubmitting(false);
    setSuccessMessage(message);
  }

  return {
    isSubmitting,
    errorMessage,
    successMessage,
    setErrorMessage,
    setSuccessMessage,
    start,
    fail,
    succeed,
  };
}
