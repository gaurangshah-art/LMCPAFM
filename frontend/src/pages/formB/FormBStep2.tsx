import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readStoredFormBId, saveFormBStep2 } from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import { LoadingState } from "../../components/common/LoadingState";
import {
  FormBAttachmentField,
  formBHasAttachment,
} from "../../components/forms/FormBAttachmentField";
import { FormBInvestigatorsSection } from "../../components/forms/FormBInvestigatorsSection";
import { readString, useFormBStepReview } from "../../hooks/useFormBStepReview";

const EMPTY = {
  title: "",
  durationMonths: "",
  proposedStartDate: "",
  proposedCompletionDate: "",
  fundingAgency: "",
  fundingAddress: "",
  fundingProofReference: "",
  summary: "",
  objectives: "",
  expectedOutcomes: "",
  annexureReference: "",
};

export function FormBStep2() {
  const navigate = useNavigate();
  const [formBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const { value: saved, loading: loadingSaved } = useFormBStepReview(
    formBId,
    "step2",
    (data) => data,
    null,
  );

  useEffect(() => {
    if (!saved) return;
    setForm({
      title: readString(saved, "title"),
      durationMonths: readString(saved, "duration_months"),
      proposedStartDate: readString(saved, "proposed_start_date"),
      proposedCompletionDate: readString(saved, "proposed_completion_date"),
      fundingAgency: readString(saved, "funding_agency"),
      fundingAddress: readString(saved, "funding_address"),
      fundingProofReference: readString(saved, "funding_proof_reference"),
      summary: readString(saved, "summary"),
      objectives: readString(saved, "objectives"),
      expectedOutcomes: readString(saved, "expected_outcomes"),
      annexureReference: readString(saved, "study_plan_annexure_reference"),
    });
  }, [saved]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep2() {
    if (!form.title.trim()) return "Project title is required.";
    if (!form.durationMonths) return "Project duration is required.";
    if (!form.proposedStartDate) return "Proposed start date is required.";
    if (!form.proposedCompletionDate) return "Proposed completion date is required.";
    if (!form.fundingAgency) return "Funding agency is required.";
    if (!form.fundingAddress.trim()) return "Funding agency address is required.";
    if (!form.summary.trim()) return "Project summary is required.";
    if (!form.objectives.trim()) return "Objectives are required.";
    if (!form.expectedOutcomes.trim()) return "Expected outcomes are required.";
    return null;
  }

  async function validateAttachments() {
    if (!formBId) return "Form B ID missing.";
    if (!(await formBHasAttachment(formBId, "funding_proof"))) {
      return "Upload funding proof before continuing.";
    }
    if (!(await formBHasAttachment(formBId, "study_plan_annexure"))) {
      return "Upload the study plan annexure before continuing.";
    }
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

    const attachmentError = await validateAttachments();
    if (attachmentError) {
      alert(attachmentError);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await saveFormBStep2({
        form_b_id: formBId,
        title: form.title.trim(),
        duration_months: Number(form.durationMonths),
        proposed_start_date: form.proposedStartDate,
        proposed_completion_date: form.proposedCompletionDate,
        funding_agency: form.fundingAgency,
        funding_address: form.fundingAddress.trim(),
        funding_proof_reference: form.fundingProofReference.trim(),
        summary: form.summary.trim(),
        objectives: form.objectives.trim(),
        expected_outcomes: form.expectedOutcomes.trim(),
        study_plan_annexure_reference: form.annexureReference.trim(),
      });

      navigate("/form-b/step-3");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loadingSaved) {
    return <LoadingState label="Loading project details..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 2</h2>
        <p>Section II: Project protocol details.</p>
      </header>

      {!formBId && (
        <p className="error-text">Form B ID not found. Please complete Step 1 first.</p>
      )}

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      {formBId && (
        <>
          <p><strong>Form B internal ID:</strong> {formBId}</p>
          <FormBInvestigatorsSection formBId={formBId} />

          <div className="form-grid">
            <label className="full-width">
              Project / Dissertation / Thesis title
              <input value={form.title} onChange={(e) => updateField("title", e.target.value)} />
            </label>
            <label>
              Duration (months)
              <select
                value={form.durationMonths}
                onChange={(e) => updateField("durationMonths", e.target.value)}
              >
                <option value="">Select duration</option>
                {[...Array(60)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} months
                  </option>
                ))}
              </select>
            </label>
            <label>
              Proposed start date
              <input
                type="date"
                value={form.proposedStartDate}
                onChange={(e) => updateField("proposedStartDate", e.target.value)}
              />
            </label>
            <label>
              Proposed completion date
              <input
                type="date"
                value={form.proposedCompletionDate}
                onChange={(e) => updateField("proposedCompletionDate", e.target.value)}
              />
            </label>
            <label>
              Funding agency
              <select
                value={form.fundingAgency}
                onChange={(e) => updateField("fundingAgency", e.target.value)}
              >
                <option value="">Select funding agency</option>
                <option value="Institutional">Institutional</option>
                <option value="Self-funded">Self-funded</option>
                <option value="Industry">Industry</option>
                <option value="Government (DST/DBT/ICMR/UGC)">Government (DST/DBT/ICMR/UGC)</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="full-width">
              Funding agency complete address
              <textarea
                value={form.fundingAddress}
                onChange={(e) => updateField("fundingAddress", e.target.value)}
              />
            </label>
            <label className="full-width">
              Funding proof reference (optional note)
              <input
                value={form.fundingProofReference}
                onChange={(e) => updateField("fundingProofReference", e.target.value)}
              />
            </label>

            {formBId ? (
              <FormBAttachmentField
                formBId={formBId}
                category="funding_proof"
                label="Funding proof attachment"
                helpText="Upload PDF, Word, JPG, or PNG up to 10 MB."
                required
              />
            ) : null}
            <label className="full-width">
              Study plan summary
              <textarea value={form.summary} onChange={(e) => updateField("summary", e.target.value)} />
            </label>
            <label className="full-width">
              Objectives
              <textarea
                value={form.objectives}
                onChange={(e) => updateField("objectives", e.target.value)}
              />
            </label>
            <label className="full-width">
              Expected outcomes
              <textarea
                value={form.expectedOutcomes}
                onChange={(e) => updateField("expectedOutcomes", e.target.value)}
              />
            </label>
            <label className="full-width">
              Study plan annexure reference (optional note)
              <input
                value={form.annexureReference}
                onChange={(e) => updateField("annexureReference", e.target.value)}
              />
            </label>

            {formBId ? (
              <FormBAttachmentField
                formBId={formBId}
                category="study_plan_annexure"
                label="Study plan annexure attachment"
                helpText="Upload the detailed study plan annexure."
                required
              />
            ) : null}
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
