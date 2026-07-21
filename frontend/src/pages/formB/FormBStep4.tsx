import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function FormBStep4() {
  const navigate = useNavigate();

  const [formBId] = useState<number | null>(
    Number(localStorage.getItem("form_b_id")) || null
  );

  const [loading, setLoading] = useState(false);

  const [procedureDescription, setProcedureDescription] = useState("");
  const [painCategory, setPainCategory] = useState("");
  const [anaesthesia, setAnaesthesia] = useState("");
  const [analgesia, setAnalgesia] = useState("");
  const [euthanasiaMethod, setEuthanasiaMethod] = useState("");
  const [alternativesConsidered, setAlternativesConsidered] = useState("");
  const [rationale3Rs, setRationale3Rs] = useState("");

  function validateStep4() {
    if (!procedureDescription.trim()) return "Procedure description is required.";
    if (!painCategory) return "Pain category is required.";
    if (!anaesthesia) return "Anaesthesia selection is required.";
    if (!analgesia) return "Analgesia selection is required.";
    if (!euthanasiaMethod) return "Euthanasia method is required.";
    if (!alternativesConsidered.trim()) return "Alternatives considered is required.";
    if (!rationale3Rs.trim()) return "3Rs justification is required.";
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      alert("Form B ID missing. Please complete previous steps.");
      return;
    }

    const error = validateStep4();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    try {
      await api.post("/form-b/step-4", {
        form_b_id: formBId,
        procedure_description: procedureDescription,
        pain_category: painCategory,
        anaesthesia,
        analgesia,
        euthanasia_method: euthanasiaMethod,
        alternatives_considered: alternativesConsidered,
        rationale_3rs: rationale3Rs,
      });

      navigate("/form-b/step-5");
    } catch {
      alert("Failed to save Step 4.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 4</h2>
        <p>Experimental Design</p>
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
              Procedure Description
              <textarea
                value={procedureDescription}
                onChange={(e) => setProcedureDescription(e.target.value)}
                placeholder="Describe the experimental procedure in detail..."
              />
            </label>

            <label>
              Pain Category (CPCSEA)
              <select value={painCategory} onChange={(e) => setPainCategory(e.target.value)}>
                <option value="">Select category</option>
                <option value="A">A – No pain</option>
                <option value="B">B – Minor pain</option>
                <option value="C">C – Moderate pain</option>
                <option value="D">D – Significant pain</option>
                <option value="E">E – Severe pain</option>
              </select>
            </label>

            <label>
              Anaesthesia
              <select value={anaesthesia} onChange={(e) => setAnaesthesia(e.target.value)}>
                <option value="">Select anaesthesia</option>
                <option value="Ketamine + Xylazine">Ketamine + Xylazine</option>
                <option value="Isoflurane">Isoflurane</option>
                <option value="Thiopentone">Thiopentone</option>
                <option value="Ether (not recommended)">Ether (not recommended)</option>
                <option value="None (Category A/B only)">None (Category A/B only)</option>
              </select>
            </label>

            <label>
              Analgesia
              <select value={analgesia} onChange={(e) => setAnalgesia(e.target.value)}>
                <option value="">Select analgesia</option>
                <option value="Buprenorphine">Buprenorphine</option>
                <option value="Tramadol">Tramadol</option>
                <option value="NSAIDs">NSAIDs</option>
                <option value="None (if justified)">None (if justified)</option>
              </select>
            </label>

            <label>
              Euthanasia Method
              <select
                value={euthanasiaMethod}
                onChange={(e) => setEuthanasiaMethod(e.target.value)}
              >
                <option value="">Select method</option>
                <option value="CO₂ chamber">CO₂ chamber</option>
                <option value="Cervical dislocation">Cervical dislocation</option>
                <option value="Overdose of anaesthetic">Overdose of anaesthetic</option>
                <option value="Other IAEC-approved method">Other IAEC-approved method</option>
              </select>
            </label>

            <label>
              Alternatives Considered
              <textarea
                value={alternativesConsidered}
                onChange={(e) => setAlternativesConsidered(e.target.value)}
                placeholder="Describe alternatives considered (in vitro, in silico, etc.)"
              />
            </label>

            <label>
              3Rs Justification (Replacement, Reduction, Refinement)
              <textarea
                value={rationale3Rs}
                onChange={(e) => setRationale3Rs(e.target.value)}
                placeholder="Explain how the study follows the 3Rs principles..."
              />
            </label>

          </div>

          <div className="wizard-actions">
            <button className="btn-secondary" onClick={() => navigate("/form-b/step-3")}>
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
