import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../api/errors";
import { saveFormBStep7 } from "../../api/formbApi";
import { LoadingState } from "../../components/common/LoadingState";
import { FormRequiredLegend } from "../../components/common/FormRequiredLegend";
import { RequiredMark } from "../../components/common/RequiredMark";
import { WizardActionBar } from "../../components/common/WizardActionBar";
import {
  FormBAttachmentField,
  formBHasAttachment,
} from "../../components/forms/FormBAttachmentField";
import {
  FORM_B_DECLARATION_LABELS,
  FORM_B_DECLARATIONS,
  type FormBDeclarationKey,
} from "../../constants/institution";
import { readBoolean, readString, useFormBStepReview } from "../../hooks/useFormBStepReview";
import { useFormBEditRouteGuard } from "../../hooks/useFormBEditRouteGuard";
import { useResolvedFormBId } from "../../hooks/useResolvedFormBId";

const EMPTY = {
  hazardousAgentsUsed: "",
  hazardousAgentDetails: "",
  aerbApprovalReference: "",
  ibscApprovalReference: "",
  rcgmApprovalReference: "",
  otherHazardousReference: "",
  cpcseaAdherence: "",
  iaecHistory: "",
  safetyMeasures: "",
  endpointCriteria: "",
  declarations: Object.fromEntries(FORM_B_DECLARATIONS.map((key) => [key, false])) as Record<
    FormBDeclarationKey,
    boolean
  >,
  declarationSignatureName: "",
  declarationDate: "",
  declarationPlace: "Ahmedabad",
};

function mapSaved(data: Record<string, unknown> | null | undefined) {
  if (!data) return EMPTY;
  const declarations = Object.fromEntries(
    FORM_B_DECLARATIONS.map((key) => [key, readBoolean(data, key)]),
  ) as Record<FormBDeclarationKey, boolean>;

  return {
    hazardousAgentsUsed: readString(data, "hazardous_agents_used"),
    hazardousAgentDetails: readString(data, "hazardous_agent_details"),
    aerbApprovalReference: readString(data, "aerb_approval_reference"),
    ibscApprovalReference: readString(data, "ibsc_approval_reference"),
    rcgmApprovalReference: readString(data, "rcgm_approval_reference"),
    otherHazardousReference: readString(data, "other_hazardous_reference"),
    cpcseaAdherence: readString(data, "cpcsea_adherence"),
    iaecHistory: readString(data, "iaec_history"),
    safetyMeasures: readString(data, "safety_measures"),
    endpointCriteria: readString(data, "endpoint_criteria"),
    declarations,
    declarationSignatureName: readString(data, "declaration_signature_name"),
    declarationDate: readString(data, "declaration_date"),
    declarationPlace: readString(data, "declaration_place") || "Ahmedabad",
  };
}

export function FormBStep7() {
  const navigate = useNavigate();
  const validationRef = useRef<HTMLDivElement | null>(null);
  const { formBId, validating: resolvingFormB, submitted } = useResolvedFormBId();
  useFormBEditRouteGuard(formBId, submitted, resolvingFormB);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDeclarationErrors, setShowDeclarationErrors] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { value: saved, loading: loadingSaved } = useFormBStepReview(formBId, "step7", mapSaved, EMPTY);

  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  }

  function showValidationIssue(message: string, highlightDeclarations = false) {
    setValidationError(message);
    setShowDeclarationErrors(highlightDeclarations);
    setErrorMessage(null);
    window.setTimeout(() => {
      validationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function validateStep7() {
    if (!form.hazardousAgentsUsed) return "Indicate whether hazardous agents are used.";
    if (form.hazardousAgentsUsed === "Yes" && !form.hazardousAgentDetails.trim()) {
      return "Describe hazardous agents used.";
    }
    if (!form.cpcseaAdherence) return "CPCSEA adherence is required.";
    if (!form.iaecHistory.trim()) return "IAEC history is required.";
    if (!form.safetyMeasures) return "Safety measures are required.";
    if (!form.endpointCriteria) return "Endpoint criteria are required.";

    for (const key of FORM_B_DECLARATIONS) {
      if (!form.declarations[key]) {
        return "Please accept all investigator declarations below before continuing.";
      }
    }

    if (!form.declarationSignatureName.trim()) return "Declaration signature name is required.";
    if (!form.declarationDate) return "Declaration date is required.";
    if (!form.declarationPlace.trim()) return "Declaration place is required.";
    return null;
  }

  async function validateCertificateAttachments() {
    if (!formBId || form.hazardousAgentsUsed !== "Yes") return null;

    const checks = [
      { reference: form.aerbApprovalReference, category: "aerb_certificate" as const, label: "AERB" },
      { reference: form.ibscApprovalReference, category: "ibsc_certificate" as const, label: "IBSC" },
      { reference: form.rcgmApprovalReference, category: "rcgm_certificate" as const, label: "RCGM" },
      {
        reference: form.otherHazardousReference,
        category: "other_hazardous_certificate" as const,
        label: "Other hazardous agent",
      },
    ];

    for (const check of checks) {
      if (check.reference.trim() && !(await formBHasAttachment(formBId, check.category))) {
        return `Upload the ${check.label} certificate file for the reference provided.`;
      }
    }

    return null;
  }

  async function handleNext() {
    if (!formBId) {
      showValidationIssue("Form B ID missing. Please complete previous steps.");
      return;
    }

    const error = validateStep7();
    if (error) {
      showValidationIssue(error, error.includes("declarations"));
      return;
    }

    const attachmentError = await validateCertificateAttachments();
    if (attachmentError) {
      showValidationIssue(attachmentError);
      return;
    }

    setLoading(true);
    setValidationError(null);
    setShowDeclarationErrors(false);
    setErrorMessage(null);
    try {
      await saveFormBStep7({
        form_b_id: formBId,
        hazardous_agents_used: form.hazardousAgentsUsed,
        hazardous_agent_details: form.hazardousAgentDetails.trim(),
        aerb_approval_reference: form.aerbApprovalReference.trim(),
        ibsc_approval_reference: form.ibscApprovalReference.trim(),
        rcgm_approval_reference: form.rcgmApprovalReference.trim(),
        other_hazardous_reference: form.otherHazardousReference.trim(),
        cpcsea_adherence: form.cpcseaAdherence,
        iaec_history: form.iaecHistory.trim(),
        safety_measures: form.safetyMeasures,
        endpoint_criteria: form.endpointCriteria,
        declaration_not_duplicative: form.declarations.declaration_not_duplicative,
        declaration_qualified: form.declarations.declaration_qualified,
        declaration_no_alternative: form.declarations.declaration_no_alternative,
        declaration_iaec_approval_for_changes:
          form.declarations.declaration_iaec_approval_for_changes,
        declaration_scientific_review: form.declarations.declaration_scientific_review,
        declaration_hazardous_certificates:
          form.declarations.declaration_hazardous_certificates,
        declaration_form_d_records: form.declarations.declaration_form_d_records,
        declaration_no_start_before_approval:
          form.declarations.declaration_no_start_before_approval,
        declaration_rehabilitation: form.declarations.declaration_rehabilitation,
        declaration_signature_name: form.declarationSignatureName.trim(),
        declaration_date: form.declarationDate,
        declaration_place: form.declarationPlace.trim(),
      });

      navigate("/form-b/review");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loadingSaved || resolvingFormB) {
    return <LoadingState label="Loading ethical compliance..." />;
  }

  return (
    <div className="page-card form-b-step7">
      <header className="section-header">
        <h2>Form B – Step 7</h2>
        <p>Section II item 14 and investigator declaration.</p>
      </header>

      <FormRequiredLegend />

      {!formBId && (
        <p className="error-text">Form B ID not found. Please complete previous steps.</p>
      )}

      {formBId && (
        <>
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="form-grid">
            <label>
              Use of hazardous agents?
              <RequiredMark />
              <select
                value={form.hazardousAgentsUsed}
                onChange={(e) => updateField("hazardousAgentsUsed", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
            <label className="full-width">
              Hazardous agent details (agents, biosafety level, disposal)
              <textarea
                value={form.hazardousAgentDetails}
                onChange={(e) => updateField("hazardousAgentDetails", e.target.value)}
              />
            </label>
            <label>
              AERB approval reference (radionucleotides)
              <input
                value={form.aerbApprovalReference}
                onChange={(e) => updateField("aerbApprovalReference", e.target.value)}
              />
            </label>
            {form.hazardousAgentsUsed === "Yes" && formBId ? (
              <FormBAttachmentField
                formBId={formBId}
                category="aerb_certificate"
                label="AERB certificate attachment"
              />
            ) : null}
            <label>
              IBSC approval reference (microorganisms / infectious agents)
              <input
                value={form.ibscApprovalReference}
                onChange={(e) => updateField("ibscApprovalReference", e.target.value)}
              />
            </label>
            {form.hazardousAgentsUsed === "Yes" && formBId ? (
              <FormBAttachmentField
                formBId={formBId}
                category="ibsc_certificate"
                label="IBSC certificate attachment"
              />
            ) : null}
            <label>
              RCGM approval reference (recombinant DNA)
              <input
                value={form.rcgmApprovalReference}
                onChange={(e) => updateField("rcgmApprovalReference", e.target.value)}
              />
            </label>
            {form.hazardousAgentsUsed === "Yes" && formBId ? (
              <FormBAttachmentField
                formBId={formBId}
                category="rcgm_certificate"
                label="RCGM certificate attachment"
              />
            ) : null}
            <label>
              Other hazardous chemical / drug approval reference
              <input
                value={form.otherHazardousReference}
                onChange={(e) => updateField("otherHazardousReference", e.target.value)}
              />
            </label>
            {form.hazardousAgentsUsed === "Yes" && formBId ? (
              <FormBAttachmentField
                formBId={formBId}
                category="other_hazardous_certificate"
                label="Other hazardous certificate attachment"
              />
            ) : null}
            <label>
              CPCSEA guidelines adherence
              <RequiredMark />
              <select
                value={form.cpcseaAdherence}
                onChange={(e) => updateField("cpcseaAdherence", e.target.value)}
              >
                <option value="">Select adherence</option>
                <option value="Yes">Yes</option>
                <option value="No (requires justification)">No (requires justification)</option>
              </select>
            </label>
            <label>
              Safety measures
              <RequiredMark />
              <select
                value={form.safetyMeasures}
                onChange={(e) => updateField("safetyMeasures", e.target.value)}
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
              Endpoint criteria
              <RequiredMark />
              <select
                value={form.endpointCriteria}
                onChange={(e) => updateField("endpointCriteria", e.target.value)}
              >
                <option value="">Select endpoint criteria</option>
                <option value="Weight loss > 20%">Weight loss &gt; 20%</option>
                <option value="Severe distress">Severe distress</option>
                <option value="Moribund condition">Moribund condition</option>
                <option value="Tumor size > 1.5 cm">Tumor size &gt; 1.5 cm</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="full-width">
              IAEC history (related previous approvals, if any)
              <RequiredMark />
              <textarea
                value={form.iaecHistory}
                onChange={(e) => updateField("iaecHistory", e.target.value)}
              />
            </label>
          </div>

          <section className="form-b-declaration-section">
            <div className="form-b-declaration-header">
              <div>
                <h3>
                  Investigator declaration
                  <RequiredMark />
                </h3>
                <p className="field-help">
                  Read each statement carefully and tick every box. All declarations are mandatory
                  before you can continue to review.
                </p>
              </div>
              <p className="declaration-progress" aria-live="polite">
                {Object.values(form.declarations).filter(Boolean).length} of{" "}
                {FORM_B_DECLARATIONS.length} accepted
              </p>
            </div>

            <div className="declaration-checklist">
              {FORM_B_DECLARATIONS.map((key, index) => {
                const checked = form.declarations[key];
                return (
                  <label
                    key={key}
                    className={`declaration-check-item${checked ? " is-checked" : ""}${
                      showDeclarationErrors && !checked ? " field-invalid" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setValidationError(null);
                        setShowDeclarationErrors(false);
                        updateField("declarations", {
                          ...form.declarations,
                          [key]: e.target.checked,
                        });
                      }}
                    />
                    <span className="declaration-check-content">
                      <span className="declaration-check-title">Declaration {index + 1}</span>
                      <span className="declaration-check-text">
                        {FORM_B_DECLARATION_LABELS[key]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="form-grid">
            <label>
              Name of investigator (signature)
              <RequiredMark />
              <input
                value={form.declarationSignatureName}
                onChange={(e) => updateField("declarationSignatureName", e.target.value)}
              />
            </label>
            <label>
              Date
              <RequiredMark />
              <input
                type="date"
                value={form.declarationDate}
                onChange={(e) => updateField("declarationDate", e.target.value)}
              />
            </label>
            <label>
              Place
              <RequiredMark />
              <input
                value={form.declarationPlace}
                onChange={(e) => updateField("declarationPlace", e.target.value)}
              />
            </label>
          </div>

          <WizardActionBar validationError={validationError ?? errorMessage} actionRef={validationRef}>
            <button type="button" className="btn-secondary" onClick={() => navigate("/form-b/step-6")}>
              ← Back
            </button>
            <button type="button" className="btn" onClick={() => void handleNext()} disabled={loading}>
              {loading ? "Saving…" : "Save & Next →"}
            </button>
          </WizardActionBar>
        </>
      )}
    </div>
  );
}
