import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../api/errors";
import { readStoredFormBId, saveFormBStep5 } from "../../api/formbApi";
import { LoadingState } from "../../components/common/LoadingState";
import { readString, useFormBStepReview } from "../../hooks/useFormBStepReview";

const EMPTY = {
  housingConditions: "",
  specialRequirements: "",
  feeding: "",
  environmentalEnrichment: "",
  animalTransportationMethods: "",
  scopeForReuse: "",
  rehabilitationDetails: "",
  carcassDisposalMethod: "",
};

function mapSaved(data: Record<string, unknown> | null | undefined) {
  if (!data) return EMPTY;
  return {
    housingConditions: readString(data, "housing_conditions"),
    specialRequirements: readString(data, "special_requirements"),
    feeding: readString(data, "feeding"),
    environmentalEnrichment: readString(data, "environmental_enrichment"),
    animalTransportationMethods: readString(data, "animal_transportation_methods"),
    scopeForReuse: readString(data, "scope_for_reuse"),
    rehabilitationDetails: readString(data, "rehabilitation_details"),
    carcassDisposalMethod: readString(data, "carcass_disposal_method"),
  };
}

export function FormBStep5() {
  const navigate = useNavigate();
  const [formBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const { value: saved, loading: loadingSaved } = useFormBStepReview(formBId, "step5", mapSaved, EMPTY);

  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep5() {
    if (!form.housingConditions) return "Housing type is required.";
    if (
      (form.housingConditions === "Special cages (IAEC-approved)" ||
        form.housingConditions === "Other") &&
      !form.specialRequirements.trim()
    ) {
      return "Describe special housing requirements when special or other housing is selected.";
    }
    if (!form.feeding) return "Feeding type is required.";
    if (!form.environmentalEnrichment) return "Environmental enrichment is required.";
    if (!form.animalTransportationMethods.trim()) return "Animal transportation methods are required.";
    if (!form.scopeForReuse.trim()) return "Scope for reuse is required.";
    if (!form.rehabilitationDetails.trim()) return "Rehabilitation details are required.";
    if (!form.carcassDisposalMethod.trim()) return "Carcass disposal method is required.";
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
    setErrorMessage(null);
    try {
      await saveFormBStep5({
        form_b_id: formBId,
        housing_conditions: form.housingConditions,
        special_requirements: form.specialRequirements,
        feeding: form.feeding,
        environmental_enrichment: form.environmentalEnrichment,
        animal_transportation_methods: form.animalTransportationMethods.trim(),
        scope_for_reuse: form.scopeForReuse.trim(),
        rehabilitation_details: form.rehabilitationDetails.trim(),
        carcass_disposal_method: form.carcassDisposalMethod.trim(),
      });

      navigate("/form-b/step-6");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loadingSaved) {
    return <LoadingState label="Loading housing and post-experiment details..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 5</h2>
        <p>Section II: Housing, transportation, and post-experimentation procedures.</p>
      </header>

      {!formBId && (
        <p className="error-text">Form B ID not found. Please complete previous steps.</p>
      )}

      {formBId && (
        <>
          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="form-grid">
            <label>
              Housing type
              <select
                value={form.housingConditions}
                onChange={(e) => updateField("housingConditions", e.target.value)}
              >
                <option value="">Select housing type</option>
                <option value="Polypropylene cages">Polypropylene cages</option>
                <option value="Individually ventilated cages (IVC)">Individually ventilated cages (IVC)</option>
                <option value="Metabolic cages">Metabolic cages</option>
                <option value="Special cages (IAEC-approved)">Special cages (IAEC-approved)</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Feeding
              <select value={form.feeding} onChange={(e) => updateField("feeding", e.target.value)}>
                <option value="">Select feeding type</option>
                <option value="Standard pellet diet">Standard pellet diet</option>
                <option value="Custom diet">Custom diet</option>
                <option value="High-fat diet">High-fat diet</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Environmental enrichment
              <select
                value={form.environmentalEnrichment}
                onChange={(e) => updateField("environmentalEnrichment", e.target.value)}
              >
                <option value="">Select enrichment</option>
                <option value="Nesting material">Nesting material</option>
                <option value="PVC pipes">PVC pipes</option>
                <option value="Wooden blocks">Wooden blocks</option>
                <option value="None">None</option>
              </select>
            </label>
            <label className="full-width">
              Special housing requirements (if any)
              <textarea
                value={form.specialRequirements}
                onChange={(e) => updateField("specialRequirements", e.target.value)}
              />
            </label>
            <label className="full-width">
              Animal transportation methods (if extra-institutional transport is envisaged)
              <textarea
                value={form.animalTransportationMethods}
                onChange={(e) => updateField("animalTransportationMethods", e.target.value)}
              />
            </label>
            <label className="full-width">
              Scope for reuse
              <textarea
                value={form.scopeForReuse}
                onChange={(e) => updateField("scopeForReuse", e.target.value)}
              />
            </label>
            <label className="full-width">
              Rehabilitation (name and address, if applicable)
              <textarea
                value={form.rehabilitationDetails}
                onChange={(e) => updateField("rehabilitationDetails", e.target.value)}
              />
            </label>
            <label className="full-width">
              Method of carcass disposal after euthanasia
              <textarea
                value={form.carcassDisposalMethod}
                onChange={(e) => updateField("carcassDisposalMethod", e.target.value)}
              />
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
