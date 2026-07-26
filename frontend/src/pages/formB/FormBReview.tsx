import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../api/errors";
import {
  clearStoredFormBId,
  getFormBReview,
  readStoredFormBId,
  submitFormB,
  type FormBReviewData,
} from "../../api/formbApi";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorAlert } from "../../components/common/ErrorAlert";

export function FormBReview() {
  const navigate = useNavigate();
  const [formBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<FormBReviewData | null>(null);

  useEffect(() => {
    if (!formBId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await getFormBReview(formBId);
        if (!cancelled) {
          setReviewData(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getApiErrorMessage(error));
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
  }, [formBId]);

  async function handleSubmit() {
    if (!formBId) return;

    if (
      !window.confirm(
        "Are you sure you want to submit Form B? You cannot edit after submission.",
      )
    ) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await submitFormB(formBId);
      clearStoredFormBId();
      navigate("/investigator-dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (!formBId) {
    return (
      <div className="page-card">
        <p className="error-text">Form B ID not found. Please complete previous steps.</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingState label="Loading review data..." />;
  }

  if (!reviewData) {
    return <ErrorAlert message={errorMessage ?? "Failed to load review data."} />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Review and Submit</h2>
        <p>Verify all details before submission.</p>
      </header>

      <p>
        <strong>Form B ID:</strong> {formBId}
      </p>

      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}

      {(["step1", "step2", "step3", "step4", "step5", "step6", "step7"] as const).map(
        (stepKey, index) => (
          <div key={stepKey} className="dashboard-section">
            <h3>
              Step {index + 1}
            </h3>
            <pre>{JSON.stringify(reviewData[stepKey] ?? null, null, 2)}</pre>
          </div>
        ),
      )}

      <div className="wizard-actions">
        <button type="button" className="btn-secondary" onClick={() => navigate("/form-b/step-7")}>
          Back
        </button>
        <button type="button" className="btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Form B"}
        </button>
      </div>
    </div>
  );
}
