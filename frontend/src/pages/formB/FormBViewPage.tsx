import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../../api/errors";
import {
  downloadFormBApplicationPdf,
  getFormBReview,
  type FormBReviewData,
} from "../../api/formbApi";
import { ErrorAlert } from "../../components/common/ErrorAlert";
import { LoadingState } from "../../components/common/LoadingState";
import { useResolvedFormBId } from "../../hooks/useResolvedFormBId";

export function FormBViewPage() {
  const { formBId, validating, submitted } = useResolvedFormBId();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<FormBReviewData | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (validating) {
      return;
    }
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
  }, [formBId, validating]);

  async function handleDownloadPdf() {
    if (!formBId) {
      return;
    }
    setDownloading(true);
    try {
      await downloadFormBApplicationPdf(formBId);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  }

  if (validating || loading) {
    return <LoadingState label="Loading submitted Form B..." />;
  }

  if (!formBId) {
    return (
      <div className="page-card">
        <ErrorAlert message="Form B ID not found." />
        <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  if (!reviewData) {
    return <ErrorAlert message={errorMessage ?? "Failed to load Form B."} />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Submitted Form B</h2>
        <p>
          Read-only view of Form B #{formBId}
          {submitted || reviewData.submitted ? " (submitted to IAEC)" : ""}.
        </p>
      </header>

      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}

      <div className="wizard-actions">
        <button type="button" className="btn" onClick={() => void handleDownloadPdf()} disabled={downloading}>
          {downloading ? "Preparing PDF…" : "Download Form B PDF"}
        </button>
        <Link className="btn btn-secondary" to="/">
          Back to dashboard
        </Link>
      </div>

      {(["step1", "step2", "step3", "step4", "step5", "step6", "step7"] as const).map(
        (stepKey, index) => (
          <div key={stepKey} className="dashboard-section">
            <h3>Step {index + 1}</h3>
            <pre>{JSON.stringify(reviewData[stepKey] ?? null, null, 2)}</pre>
          </div>
        ),
      )}
    </div>
  );
}
