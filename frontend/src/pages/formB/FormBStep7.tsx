import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function FormBStep7() {
  const navigate = useNavigate();

  const [formBId] = useState<number | null>(
    Number(localStorage.getItem("form_b_id")) || null
  );

  const [loading, setLoading] = useState(false);

  const [cpcseaAdherence, setCpcseaAdherence] = useState("");
  const [iaecHistory, setIaecHistory] = useState("");
  const [safetyMeasures, setSafetyMeasures] = useState("");
  const [endpointCriteria, setEndpointCriteria] = useState("");

  function validateStep7() {
    if (!cpcseaAdherence) return "CPCSEA adherence is required.";
    if (!iaecHistory.trim()) return "IAEC history is required.";
    if (!safetyMeasures) return "Safety measures are required.";
    if (!endpointCriteria) return "Endpoint criteria are required.";
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      alert("Form B ID missing. Please complete previous steps.");
      return;
    }

    const error = validateStep7();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    try {
      await api.post("/form-b/step-7", {
        form_b_id: formBId,
        cpcsea_adherence: cpcseaAdherence,
        iaec_history: iaecHistory,
        safety_measures: safetyMeasures,
        endpoint_criteria: endpointCriteria,
      });

      navigate("/form-b/review");
    } catch {
      alert("Failed to save Step 7.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 7</h2>
        <p>Ethical Compliance</p>
      </header>

      {!formBId && (
        <p className="error-text">
          Form B ID not found. Please complete previous steps.
        </p>
      )}

      {formBId && (
        <>
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="form-grid">

            <label>
              CPCSEA Guidelines Adherence
              <select
                value={cpcseaAdherence}
                onChange={(e) => setCpcseaAdherence(e.target.value)}
              >
                <option value="">Select adherence</option>
                <option value="Yes">Yes</option>
                <option value="No (requires justification)">
                  No (requires justification)
                </option>
              </select>
            </label>

            <label>
              IAEC History (related previous approvals, if any)
              <textarea
                value={iaecHistory}
                onChange={(e) => setIaecHistory(e.target.value)}
                placeholder="Describe any previous IAEC approvals or related projects..."
              />
            </label>

            <label>
              Safety Measures
              <select
                value={safetyMeasures}
                onChange={(e) => setSafetyMeasures(e.target.value)}
              >
                <option value="">Select safety measures</option>
                <option value="PPE">PPE</option>
                <option value="Biosafety cabinet">Biosafety cabinet</option>
                <option value="Fume hood">Fume hood</option>
                <option value="Gloves + Mask">Gloves + Mask</option>
                <option value="None">None</option>
              </select>
            </label>

            <label>
              Endpoint Criteria
              <select
                value={endpointCriteria}
                onChange={(e) => setEndpointCriteria(e.target.value)}
              >
                <option value="">Select endpoint criteria</option>

                {/* FIXED JSX ERRORS HERE */}
                <option value="Weight loss > 20%">
                  Weight loss &gt; 20%
                </option>

                <option value="Severe distress">Severe distress</option>
                <option value="Moribund condition">Moribund condition</option>

                {/* FIXED JSX ERRORS HERE */}
                <option value="Tumor size > 1.5 cm">
                  Tumor size &gt; 1.5 cm
                </option>

                <option value="Other">Other</option>
              </select>
            </label>

          </div>

          <div className="wizard-actions">
            <button
              className="btn-secondary"
              onClick={() => navigate("/form-b/step-6")}
            >
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
