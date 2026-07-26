import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../api/errors";
import { readStoredFormBId, saveFormBStep6 } from "../../api/formbApi";

export function FormBStep6() {
  const navigate = useNavigate();

  const [formBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [personnelNames, setPersonnelNames] = useState("");
  const [trainingLevel, setTrainingLevel] = useState("");
  const [trainingDetails, setTrainingDetails] = useState("");
  const [competencyCertification, setCompetencyCertification] = useState("");

  function validateStep6() {
    if (!personnelNames.trim()) return "Personnel names are required.";
    if (!trainingLevel) return "Training level is required.";
    if (!trainingDetails.trim()) return "Training details are required.";
    if (!competencyCertification) return "Competency certification is required.";
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      alert("Form B ID missing. Please complete previous steps.");
      return;
    }

    const error = validateStep6();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await saveFormBStep6({
        form_b_id: formBId,
        personnel_names: personnelNames.split(",").map((p) => p.trim()).filter(Boolean),
        training_level: trainingLevel,
        training_details: trainingDetails,
        competency_certification: competencyCertification,
      });

      navigate("/form-b/step-7");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 6</h2>
        <p>Personnel & Training</p>
      </header>

      {!formBId && (
        <p className="error-text">
          Form B ID not found. Please complete previous steps.
        </p>
      )}

      {formBId && (
        <>
          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="form-grid">

            <label>
              Personnel Names
              <textarea
                value={personnelNames}
                onChange={(e) => setPersonnelNames(e.target.value)}
                placeholder="Enter names separated by commas (e.g., Dr. A, Mr. B, Ms. C)"
              />
            </label>

            <label>
              Training Level
              <select
                value={trainingLevel}
                onChange={(e) => setTrainingLevel(e.target.value)}
              >
                <option value="">Select training level</option>
                <option value="Basic animal handling">Basic animal handling</option>
                <option value="Advanced animal handling">Advanced animal handling</option>
                <option value="Surgical training">Surgical training</option>
                <option value="CPCSEA training">CPCSEA training</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Training Details
              <textarea
                value={trainingDetails}
                onChange={(e) => setTrainingDetails(e.target.value)}
                placeholder="Describe training received by personnel..."
              />
            </label>

            <label>
              Competency Certification
              <select
                value={competencyCertification}
                onChange={(e) => setCompetencyCertification(e.target.value)}
              >
                <option value="">Select certification</option>
                <option value="Certified by IAEC">Certified by IAEC</option>
                <option value="Certified by CPCSEA">Certified by CPCSEA</option>
                <option value="Certified by Institutional Committee">
                  Certified by Institutional Committee
                </option>
                <option value="Other">Other</option>
              </select>
            </label>

          </div>

          <div className="wizard-actions">
            <button className="btn-secondary" onClick={() => navigate("/form-b/step-5")}>
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
