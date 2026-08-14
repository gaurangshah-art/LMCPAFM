import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readStoredFormBId, saveFormBStep2 } from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import { LoadingState } from "../../components/common/LoadingState";
import {
  FormBAttachmentField,
  formBHasAttachment,
} from "../../components/forms/FormBAttachmentField";
import { FormBInvestigatorsSection } from "../../components/forms/FormBInvestigatorsSection";
import {
  FUNDING_PROOF_REFERENCE_OPTIONS,
  parseFundingProofReferences,
} from "../../constants/formBStep2";
import { DraftRestoreBanner } from "../../components/common/DraftRestoreBanner";
import { useFormDraftPersistence } from "../../hooks/useFormDraftPersistence";
import { readString, useFormBStepReview } from "../../hooks/useFormBStepReview";
import { validateDateOnOrAfter } from "../../utils/businessValidation";

const EMPTY = {
  title: "",
  durationMonths: "",
  proposedStartDate: "",
  proposedCompletionDate: "",
  fundingAgency: "",
  fundingAddress: "",
  fundingProofReferences: [] as string[],
  summary: "",
  objectives: "",
  expectedOutcomes: "",
  annexureReference: "",
};

export function FormBStep2() {
  const navigate = useNavigate();
  const validationRef = useRef<HTMLDivElement | null>(null);
  const [formBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showFundingProofError, setShowFundingProofError] = useState(false);
  const [showLegacyFundingNote, setShowLegacyFundingNote] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  const { value: saved, loading: loadingSaved } = useFormBStepReview(
    formBId,
    "step2",
    (data) => data,
    null,
  );

  useEffect(() => {
    if (!saved || hydrated) return;
    const parsedReferences = parseFundingProofReferences(
      (saved as Record<string, unknown>).funding_proof_references ??
        (saved as Record<string, unknown>).funding_proof_reference,
    );
    const legacyRaw =
      (saved as Record<string, unknown>).funding_proof_reference ??
      (saved as Record<string, unknown>).funding_proof_references;
    const hadLegacyText =
      typeof legacyRaw === "string" &&
      legacyRaw.trim().length > 0 &&
      parsedReferences.length === 0;
    setForm({
      title: readString(saved, "title"),
      durationMonths: readString(saved, "duration_months"),
      proposedStartDate: readString(saved, "proposed_start_date"),
      proposedCompletionDate: readString(saved, "proposed_completion_date"),
      fundingAgency: readString(saved, "funding_agency"),
      fundingAddress: readString(saved, "funding_address"),
      fundingProofReferences: parsedReferences,
      summary: readString(saved, "summary"),
      objectives: readString(saved, "objectives"),
      expectedOutcomes: readString(saved, "expected_outcomes"),
      annexureReference: readString(saved, "study_plan_annexure_reference"),
    });
    setShowLegacyFundingNote(hadLegacyText);
    setHydrated(true);
  }, [saved, hydrated]);

  const { restoreOffer, acceptRestore, dismissRestore, clearDraft } = useFormDraftPersistence({
    formBId,
    stepKey: "step2",
    draft: form,
    hydrated,
    applyDraft: setForm,
  });

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationError(null);
    if (key === "fundingProofReferences") {
      setShowFundingProofError(false);
    }
  }

  function toggleFundingProof(option: string) {
    setForm((current) => {
      const selected = new Set(current.fundingProofReferences);
      if (selected.has(option)) {
        selected.delete(option);
      } else {
        selected.add(option);
      }
      return { ...current, fundingProofReferences: Array.from(selected) };
    });
    setShowFundingProofError(false);
    setValidationError(null);
  }

  function validateStep2() {
    if (!form.title.trim()) return "Project title is required.";
    if (!form.durationMonths) return "Project duration is required.";
    if (!form.proposedStartDate) return "Proposed start date is required.";
    if (!form.proposedCompletionDate) return "Proposed completion date is required.";
    const dateError = validateDateOnOrAfter(
      form.proposedCompletionDate,
      form.proposedStartDate,
      "Proposed completion date",
      "proposed start date",
    );
    if (dateError) return dateError;
    if (!form.fundingAgency) return "Funding agency is required.";
    if (!form.fundingAddress.trim()) return "Funding agency address is required.";
    if (!form.fundingProofReferences.length) {
      return "Select at least one funding proof reference (scroll up to the checkbox list above the attachment).";
    }
    if (!form.summary.trim()) return "Study plan summary is required.";
    if (!form.objectives.trim()) return "Objectives are required.";
    if (!form.expectedOutcomes.trim()) return "Expected outcomes are required.";
    if (!form.annexureReference.trim()) {
      return "Study plan note is required (brief about the project in 1–2 lines).";
    }
    return null;
  }

  async function validateAttachments() {
    if (!formBId) return "Form B ID missing.";
    if (!(await formBHasAttachment(formBId, "funding_proof"))) {
      return "Upload funding proof before continuing.";
    }
    return null;
  }

  function showValidationIssue(message: string, highlightFundingProof = false) {
    setValidationError(message);
    setShowFundingProofError(highlightFundingProof);
    setErrorMessage(null);
    window.setTimeout(() => {
      validationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  async function handleNext() {
    if (!formBId) {
      showValidationIssue("Form B ID missing. Please complete Step 1 first.");
      return;
    }

    const error = validateStep2();
    if (error) {
      showValidationIssue(error, error.includes("funding proof reference"));
      return;
    }

    const attachmentError = await validateAttachments();
    if (attachmentError) {
      showValidationIssue(attachmentError);
      return;
    }

    setLoading(true);
    setValidationError(null);
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
        funding_proof_references: parseFundingProofReferences(form.fundingProofReferences),
        summary: form.summary.trim(),
        objectives: form.objectives.trim(),
        expected_outcomes: form.expectedOutcomes.trim(),
        study_plan_annexure_reference: form.annexureReference.trim(),
      });
      clearDraft();

      navigate("/form-b/step-2b");
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      showValidationIssue(message, message.toLowerCase().includes("funding proof"));
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

      {restoreOffer ? (
        <DraftRestoreBanner onRestore={acceptRestore} onDismiss={dismissRestore} />
      ) : null}

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

            <fieldset
              className={`full-width checkbox-group${showFundingProofError ? " field-invalid" : ""}`}
              id="funding-proof-reference"
            >
              <legend>Funding proof reference *</legend>
              {showLegacyFundingNote ? (
                <p className="field-help">
                  A previous free-text funding note was saved earlier. Please select the
                  applicable proof type(s) from the list below.
                </p>
              ) : (
                <p className="field-help">
                  Select all applicable proof types, then upload the document(s) below.
                </p>
              )}
              {form.fundingProofReferences.length > 0 ? (
                <p className="field-help">
                  Selected: {form.fundingProofReferences.length} option
                  {form.fundingProofReferences.length === 1 ? "" : "s"}
                </p>
              ) : null}
              {FUNDING_PROOF_REFERENCE_OPTIONS.map((option) => (
                <label key={option} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.fundingProofReferences.includes(option)}
                    onChange={() => toggleFundingProof(option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>

            {formBId ? (
              <FormBAttachmentField
                formBId={formBId}
                category="funding_proof"
                label="Funding proof attachment"
                helpText="Upload PDF, Word, JPG, or PNG up to 10 MB for the proof type(s) selected above."
                required
              />
            ) : null}

            <label className="full-width">
              Study plan summary *
              <span className="field-help">Brief about the project in 1–2 lines.</span>
              <textarea
                value={form.summary}
                onChange={(e) => updateField("summary", e.target.value)}
                rows={3}
              />
            </label>
            <label className="full-width">
              Objectives *
              <textarea
                value={form.objectives}
                onChange={(e) => updateField("objectives", e.target.value)}
              />
            </label>
            <label className="full-width">
              Expected outcomes *
              <textarea
                value={form.expectedOutcomes}
                onChange={(e) => updateField("expectedOutcomes", e.target.value)}
              />
            </label>
            <label className="full-width">
              Study plan note *
              <span className="field-help">
                Brief about the project in 1–2 lines. Detailed experimental groups are entered in the
                next step (Step 2b).
              </span>
              <textarea
                value={form.annexureReference}
                onChange={(e) => updateField("annexureReference", e.target.value)}
                rows={2}
                maxLength={500}
              />
            </label>
          </div>

          <div ref={validationRef} className="wizard-actions">
            {validationError ? (
              <p className="error-text wizard-validation-error full-width">{validationError}</p>
            ) : null}
            <button type="button" className="btn-secondary" onClick={() => navigate("/form-b/step-1")}>
              ← Back
            </button>
            <button type="button" className="btn" onClick={() => void handleNext()} disabled={loading}>
              {loading ? "Saving…" : "Save & Next →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
