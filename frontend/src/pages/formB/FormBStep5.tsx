import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function FormBStep5() {
  const navigate = useNavigate();

  const [formBId] = useState<number | null>(
    Number(localStorage.getItem("form_b_id")) || null
  );

  const [loading, setLoading] = useState(false);

  const [housingConditions, setHousingConditions] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [feeding, setFeeding] = useState("");
  const [environmentalEnrichment, setEnvironmentalEnrichment] = useState("");

  function validateStep5() {
    if (!housingConditions) return "Housing type is required.";
    if (!feeding) return "Feeding type is required.";
    if (!environmentalEnrichment) return "Environmental enrichment is required.";
    return null;
  }

  async function handleNext() {
    if (!formBId) {
      alert("Form B ID missing. Please complete previous steps.");
      return;
    }

    const error = validateStep5();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    try {
      await api.post("/form-b/step-5", {
        form_b_id: formBId,
        housing_conditions: housingConditions,
        special_requirements: specialRequirements,
        feeding,
        environmental_enrichment: environmentalEnrichment,
      });

      navigate("/form-b/step-6");
    } catch {
      alert("Failed to save Step 5.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 5</h2>
        <p>Housing & Husbandry</p>
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
              Housing Type
              <select
                value={housingConditions}
                onChange={(e) => setHousingConditions(e.target.value)}
              >
                <option value="">Select housing type</option>
                <option value="Polypropylene cages">Polypropylene cages</option>
                <option value="Individually ventilated cages (IVC)">
                  Individually ventilated cages (IVC)
                </option>
                <option value="Metabolic cages">Metabolic cages</option>
                <option value="Special cages (IAEC-approved)">Special cages (IAEC-approved)</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Special Requirements (if any)
              <textarea
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                placeholder="Describe any special housing or husbandry requirements..."
              />
            </label>

            <label>
              Feeding
              <select value={feeding} onChange={(e) => setFeeding(e.target.value)}>
                <option value="">Select feeding type</option>
                <option value="Standard pellet diet">Standard pellet diet</option>
                <option value="Custom diet">Custom diet</option>
                <option value="High-fat diet">High-fat diet</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Environmental Enrichment
              <select
                value={environmentalEnrichment}
                onChange={(e) => setEnvironmentalEnrichment(e.target.value)}
              >
                <option value="">Select enrichment</option>
                <option value="Nesting material">Nesting material</option>
                <option value="PVC pipes">PVC pipes</option>
                <option value="Wooden blocks">Wooden blocks</option>
                <option value="None">None</option>
              </select>
            </label>

          </div>

          <div className="wizard-actions">
            <button className="btn-secondary" onClick={() => navigate("/form-b/step-4")}>
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
