import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { readStoredFormBId } from "../../api/formbApi";

export function FormBStep2() {
  const navigate = useNavigate();

  const [formBId] = useState<number | null>(readStoredFormBId());

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [fundingAgency, setFundingAgency] = useState("");
  const [summary, setSummary] = useState("");
  const [objectives, setObjectives] = useState("");
  const [expectedOutcomes, setExpectedOutcomes] = useState("");

  function validateStep2() {
    if (!title.trim()) return "Project title is required.";
    if (!durationMonths) return "Project duration is required.";
    if (!fundingAgency) return "Funding agency is required.";
    if (!summary.trim()) return "Project summary is required.";
    if (!objectives.trim()) return "Objectives are required.";
    if (!expectedOutcomes.trim()) return "Expected outcomes are required.";
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      alert("Form B ID missing. Please complete Step 1 first.");
      return;
    }

    const error = validateStep2();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    try {
      await api.post("/form-b/step-2", {
        form_b_id: formBId,
        title,
        duration_months: Number(durationMonths),
        funding_agency: fundingAgency,
        summary,
        objectives,
        expected_outcomes: expectedOutcomes,
      });

      navigate("/form-b/step-3");
    } catch {
      alert("Failed to save Step 2.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 2</h2>
        <p>Project Details</p>
      </header>

      {!formBId && (
        <p className="error-text">
          Form B ID not found. Please complete Step 1 first.
        </p>
      )}

      {formBId && (
        <>
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="form-grid">

            <label>
              Project Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label>
              Duration (months)
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              >
                <option value="">Select duration</option>
                {[...Array(24)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} months
                  </option>
                ))}
              </select>
            </label>

            <label>
              Funding Agency
              <select
                value={fundingAgency}
                onChange={(e) => setFundingAgency(e.target.value)}
              >
                <option value="">Select funding agency</option>
                <option value="Institutional">Institutional</option>
                <option value="Self-funded">Self-funded</option>
                <option value="Industry">Industry</option>
                <option value="Government (DST/DBT/ICMR/UGC)">
                  Government (DST/DBT/ICMR/UGC)
                </option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Project Summary
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </label>

            <label>
              Objectives
              <textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
              />
            </label>

            <label>
              Expected Outcomes
              <textarea
                value={expectedOutcomes}
                onChange={(e) => setExpectedOutcomes(e.target.value)}
              />
            </label>

          </div>

          <div className="wizard-actions">
            <button className="btn-secondary" onClick={() => navigate("/form-b/step-1")}>
              ← Back
            </button>

            <button className="btn" onClick={handleNext} disabled={loading}>
              Save & Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
