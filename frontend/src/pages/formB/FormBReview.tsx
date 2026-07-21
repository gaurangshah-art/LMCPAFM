import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function FormBReview() {
  const navigate = useNavigate();

  const [formBId] = useState<number | null>(
    Number(localStorage.getItem("form_b_id")) || null
  );

  const [loading, setLoading] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);

  useEffect(() => {
    if (!formBId) return;

    async function fetchReview() {
      setLoading(true);
      try {
        const res = await api.get(`/form-b/${formBId}/review`);
        setReviewData(res.data);
      } catch {
        alert("Failed to load review data.");
      } finally {
        setLoading(false);
      }
    }

    fetchReview();
  }, [formBId]);

  async function handleSubmit() {
    if (!formBId) {
      alert("Form B ID missing.");
      return;
    }

    if (!window.confirm("Are you sure you want to submit Form B? You cannot edit after submission.")) {
      return;
    }

    setLoading(true);
    try {
      await api.post("/form-b/submit", { form_b_id: formBId });

      alert("Form B submitted successfully!");
      localStorage.removeItem("form_b_id");
      navigate("/dashboard");
    } catch {
      alert("Failed to submit Form B.");
    } finally {
      setLoading(false);
    }
  }

  if (!formBId) {
    return (
      <div className="page-card">
        <p className="error-text">Form B ID not found. Please complete previous steps.</p>
      </div>
    );
  }

  if (loading || !reviewData) {
    return (
      <div className="page-card">
        <p>Loading review data...</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Review & Submit</h2>
        <p>Please verify all details before submission.</p>
      </header>

      <p><strong>Form B internal ID:</strong> {formBId}</p>

      <div className="review-section">
        <h3>Step 1 – Investigator & Establishment Details</h3>
        <pre>{JSON.stringify(reviewData.step1, null, 2)}</pre>
      </div>

      <div className="review-section">
        <h3>Step 2 – Project Details</h3>
        <pre>{JSON.stringify(reviewData.step2, null, 2)}</pre>
      </div>

      <div className="review-section">
        <h3>Step 3 – Animal Requirements</h3>
        <pre>{JSON.stringify(reviewData.step3, null, 2)}</pre>
      </div>

      <div className="review-section">
        <h3>Step 4 – Experimental Design</h3>
        <pre>{JSON.stringify(reviewData.step4, null, 2)}</pre>
      </div>

      <div className="review-section">
        <h3>Step 5 – Housing & Husbandry</h3>
        <pre>{JSON.stringify(reviewData.step5, null, 2)}</pre>
      </div>

      <div className="review-section">
        <h3>Step 6 – Personnel & Training</h3>
        <pre>{JSON.stringify(reviewData.step6, null, 2)}</pre>
      </div>

      <div className="review-section">
        <h3>Step 7 – Ethical Compliance</h3>
        <pre>{JSON.stringify(reviewData.step7, null, 2)}</pre>
      </div>

      <div className="wizard-actions">
        <button className="btn-secondary" onClick={() => navigate("/form-b/step-7")}>
          ← Back
        </button>

        <button className="btn" onClick={handleSubmit} disabled={loading}>
          Submit Form B →
        </button>
      </div>
    </div>
  );
}
