import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../api/errors";
import { saveFormBStep4 } from "../../api/formbApi";
import { LoadingState } from "../../components/common/LoadingState";
import { FormRequiredLegend } from "../../components/common/FormRequiredLegend";
import { RequiredMark } from "../../components/common/RequiredMark";
import { WizardActionBar } from "../../components/common/WizardActionBar";
import { readString, useFormBStepReview } from "../../hooks/useFormBStepReview";
import { useFormBEditRouteGuard } from "../../hooks/useFormBEditRouteGuard";
import { useResolvedFormBId } from "../../hooks/useResolvedFormBId";
import { useWizardValidation } from "../../hooks/useWizardValidation";

const EMPTY = {
  procedureDescription: "",
  injectionSubstances: "",
  injectionDoses: "",
  injectionSites: "",
  injectionVolumes: "",
  bloodWithdrawalVolumes: "",
  bloodWithdrawalSites: "",
  radiationDosageSchedule: "",
  compoundNceDetails: "",
  painCategory: "",
  anaesthesia: "",
  analgesia: "",
  prohibitAnalgesicAnesthetic: "",
  prohibitAnalgesicJustification: "",
  survivalSurgery: "",
  surgicalProcedures: "",
  surgicalPersonnel: "",
  postOperativeCare: "",
  repeatSurgeryJustification: "",
  euthanasiaMethod: "",
  alternativesConsidered: "",
  rationale3Rs: "",
};

function mapSaved(data: Record<string, unknown> | null | undefined) {
  if (!data) return EMPTY;
  return {
    procedureDescription: readString(data, "procedure_description"),
    injectionSubstances: readString(data, "injection_substances"),
    injectionDoses: readString(data, "injection_doses"),
    injectionSites: readString(data, "injection_sites"),
    injectionVolumes: readString(data, "injection_volumes"),
    bloodWithdrawalVolumes: readString(data, "blood_withdrawal_volumes"),
    bloodWithdrawalSites: readString(data, "blood_withdrawal_sites"),
    radiationDosageSchedule: readString(data, "radiation_dosage_schedule"),
    compoundNceDetails: readString(data, "compound_nce_details"),
    painCategory: readString(data, "pain_category"),
    anaesthesia: readString(data, "anaesthesia"),
    analgesia: readString(data, "analgesia"),
    prohibitAnalgesicAnesthetic: readString(data, "prohibit_analgesic_anesthetic"),
    prohibitAnalgesicJustification: readString(data, "prohibit_analgesic_justification"),
    survivalSurgery: readString(data, "survival_surgery"),
    surgicalProcedures: readString(data, "surgical_procedures"),
    surgicalPersonnel: readString(data, "surgical_personnel"),
    postOperativeCare: readString(data, "post_operative_care"),
    repeatSurgeryJustification: readString(data, "repeat_surgery_justification"),
    euthanasiaMethod: readString(data, "euthanasia_method"),
    alternativesConsidered: readString(data, "alternatives_considered"),
    rationale3Rs: readString(data, "rationale_3rs"),
  };
}

export function FormBStep4() {
  const navigate = useNavigate();
  const { formBId, validating: resolvingFormB, submitted } = useResolvedFormBId();
  useFormBEditRouteGuard(formBId, submitted, resolvingFormB);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { validationRef, validationError, showValidationError, clearValidationError } =
    useWizardValidation();
  const [form, setForm] = useState(EMPTY);

  const { value: saved, loading: loadingSaved } = useFormBStepReview(formBId, "step4", mapSaved, EMPTY);

  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep4() {
    if (!form.procedureDescription.trim()) return "Procedure description is required.";
    if (!form.painCategory) return "Pain category is required.";
    if (!form.anaesthesia) return "Anaesthesia selection is required.";
    if (!form.analgesia) return "Analgesia selection is required.";
    if (!form.prohibitAnalgesicAnesthetic) return "Answer whether analgesic/anesthetic use is prohibited.";
    if (
      form.prohibitAnalgesicAnesthetic === "Yes" &&
      !form.prohibitAnalgesicJustification.trim()
    ) {
      return "Justification is required when analgesic/anesthetic use is prohibited.";
    }
    if (!form.survivalSurgery) return "Indicate whether survival surgery will be done.";
    if (form.survivalSurgery === "Yes") {
      if (!form.surgicalProcedures.trim()) return "Describe surgical procedures.";
      if (!form.surgicalPersonnel.trim()) return "List surgical personnel.";
      if (!form.postOperativeCare.trim()) return "Describe post-operative care.";
    }
    if (!form.euthanasiaMethod) return "Euthanasia method is required.";
    if (!form.alternativesConsidered.trim()) return "Alternatives considered is required.";
    if (!form.rationale3Rs.trim()) return "3Rs justification is required.";

    const injectionFields = [
      form.injectionSubstances,
      form.injectionDoses,
      form.injectionSites,
      form.injectionVolumes,
    ];
    if (injectionFields.some((value) => value.trim()) && !injectionFields.every((value) => value.trim())) {
      return "When injections are used, substances, doses, sites, and volumes are all required.";
    }

    const bloodFields = [form.bloodWithdrawalVolumes, form.bloodWithdrawalSites];
    if (bloodFields.some((value) => value.trim()) && !bloodFields.every((value) => value.trim())) {
      return "When blood withdrawal is described, both volume and site details are required.";
    }

    return null;
  }

  async function handleNext() {
    if (!formBId) {
      showValidationError("Form B ID missing. Please complete previous steps.");
      return;
    }

    const error = validateStep4();
    if (error) {
      showValidationError(error);
      return;
    }

    clearValidationError();
    setLoading(true);
    setErrorMessage(null);
    try {
      await saveFormBStep4({
        form_b_id: formBId,
        procedure_description: form.procedureDescription.trim(),
        injection_substances: form.injectionSubstances.trim(),
        injection_doses: form.injectionDoses.trim(),
        injection_sites: form.injectionSites.trim(),
        injection_volumes: form.injectionVolumes.trim(),
        blood_withdrawal_volumes: form.bloodWithdrawalVolumes.trim(),
        blood_withdrawal_sites: form.bloodWithdrawalSites.trim(),
        radiation_dosage_schedule: form.radiationDosageSchedule.trim(),
        compound_nce_details: form.compoundNceDetails.trim(),
        pain_category: form.painCategory,
        anaesthesia: form.anaesthesia,
        analgesia: form.analgesia,
        prohibit_analgesic_anesthetic: form.prohibitAnalgesicAnesthetic,
        prohibit_analgesic_justification: form.prohibitAnalgesicJustification.trim(),
        survival_surgery: form.survivalSurgery,
        surgical_procedures: form.surgicalProcedures.trim(),
        surgical_personnel: form.surgicalPersonnel.trim(),
        post_operative_care: form.postOperativeCare.trim(),
        repeat_surgery_justification: form.repeatSurgeryJustification.trim(),
        euthanasia_method: form.euthanasiaMethod,
        alternatives_considered: form.alternativesConsidered.trim(),
        rationale_3rs: form.rationale3Rs.trim(),
      });

      navigate("/form-b/step-5");
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      showValidationError(message);
    } finally {
      setLoading(false);
    }
  }

  if (loadingSaved || resolvingFormB) {
    return <LoadingState label="Loading experimental design..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 4</h2>
        <p>Section II: Procedures, injections, surgery, and euthanasia.</p>
      </header>

      <FormRequiredLegend />

      {!formBId && (
        <p className="error-text">Form B ID not found. Please complete previous steps.</p>
      )}

      {formBId && (
        <>
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="form-grid">
            <label className="full-width">
              Describe all invasive and potentially stressful procedures
              <RequiredMark />
              <textarea
                value={form.procedureDescription}
                onChange={(e) => updateField("procedureDescription", e.target.value)}
              />
            </label>
            <label>
              Injection substances
              <textarea
                value={form.injectionSubstances}
                onChange={(e) => updateField("injectionSubstances", e.target.value)}
              />
            </label>
            <label>
              Injection doses
              <textarea
                value={form.injectionDoses}
                onChange={(e) => updateField("injectionDoses", e.target.value)}
              />
            </label>
            <label>
              Injection sites
              <textarea
                value={form.injectionSites}
                onChange={(e) => updateField("injectionSites", e.target.value)}
              />
            </label>
            <label>
              Injection volumes
              <textarea
                value={form.injectionVolumes}
                onChange={(e) => updateField("injectionVolumes", e.target.value)}
              />
            </label>
            <label>
              Blood withdrawal volumes
              <textarea
                value={form.bloodWithdrawalVolumes}
                onChange={(e) => updateField("bloodWithdrawalVolumes", e.target.value)}
              />
            </label>
            <label>
              Blood withdrawal sites
              <textarea
                value={form.bloodWithdrawalSites}
                onChange={(e) => updateField("bloodWithdrawalSites", e.target.value)}
              />
            </label>
            <label className="full-width">
              Radiation dosage and schedules
              <textarea
                value={form.radiationDosageSchedule}
                onChange={(e) => updateField("radiationDosageSchedule", e.target.value)}
              />
            </label>
            <label className="full-width">
              Nature of compound / NCE details
              <textarea
                value={form.compoundNceDetails}
                onChange={(e) => updateField("compoundNceDetails", e.target.value)}
              />
            </label>
            <label>
              Pain category (CPCSEA)
              <RequiredMark />
              <select value={form.painCategory} onChange={(e) => updateField("painCategory", e.target.value)}>
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
              <RequiredMark />
              <select value={form.anaesthesia} onChange={(e) => updateField("anaesthesia", e.target.value)}>
                <option value="">Select anaesthesia</option>
                <option value="Ketamine + Xylazine">Ketamine + Xylazine</option>
                <option value="Isoflurane">Isoflurane</option>
                <option value="Thiopentone">Thiopentone</option>
                <option value="None (Category A/B only)">None (Category A/B only)</option>
              </select>
            </label>
            <label>
              Analgesia
              <RequiredMark />
              <select value={form.analgesia} onChange={(e) => updateField("analgesia", e.target.value)}>
                <option value="">Select analgesia</option>
                <option value="Buprenorphine">Buprenorphine</option>
                <option value="Tramadol">Tramadol</option>
                <option value="NSAIDs">NSAIDs</option>
                <option value="None (if justified)">None (if justified)</option>
              </select>
            </label>
            <label>
              Prohibit use of anaesthetic/analgesic for painful procedures?
              <select
                value={form.prohibitAnalgesicAnesthetic}
                onChange={(e) => updateField("prohibitAnalgesicAnesthetic", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
            <label className="full-width">
              If yes, justify prohibition of anaesthetic/analgesic
              <textarea
                value={form.prohibitAnalgesicJustification}
                onChange={(e) => updateField("prohibitAnalgesicJustification", e.target.value)}
              />
            </label>
            <label>
              Will survival surgery be done?
              <select
                value={form.survivalSurgery}
                onChange={(e) => updateField("survivalSurgery", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
            {form.survivalSurgery === "Yes" ? (
              <>
                <label className="full-width">
                  Surgical procedures (including asepsis methods)
                  <textarea
                    value={form.surgicalProcedures}
                    onChange={(e) => updateField("surgicalProcedures", e.target.value)}
                  />
                </label>
                <label className="full-width">
                  Surgical personnel (names, qualifications, experience)
                  <textarea
                    value={form.surgicalPersonnel}
                    onChange={(e) => updateField("surgicalPersonnel", e.target.value)}
                  />
                </label>
                <label className="full-width">
                  Post-operative care
                  <textarea
                    value={form.postOperativeCare}
                    onChange={(e) => updateField("postOperativeCare", e.target.value)}
                  />
                </label>
                <label className="full-width">
                  Justify repeat major survival surgery on the same animal (if applicable)
                  <textarea
                    value={form.repeatSurgeryJustification}
                    onChange={(e) => updateField("repeatSurgeryJustification", e.target.value)}
                  />
                </label>
              </>
            ) : null}
            <label>
              Euthanasia method
              <RequiredMark />
              <select
                value={form.euthanasiaMethod}
                onChange={(e) => updateField("euthanasiaMethod", e.target.value)}
              >
                <option value="">Select method</option>
                <option value="CO₂ chamber">CO₂ chamber</option>
                <option value="Cervical dislocation">Cervical dislocation</option>
                <option value="Overdose of anaesthetic">Overdose of anaesthetic</option>
                <option value="Other IAEC-approved method">Other IAEC-approved method</option>
              </select>
            </label>
            <label className="full-width">
              Alternatives considered
              <RequiredMark />
              <textarea
                value={form.alternativesConsidered}
                onChange={(e) => updateField("alternativesConsidered", e.target.value)}
              />
            </label>
            <label className="full-width">
              3Rs justification (Replacement, Reduction, Refinement)
              <RequiredMark />
              <textarea
                value={form.rationale3Rs}
                onChange={(e) => updateField("rationale3Rs", e.target.value)}
              />
            </label>
          </div>

          <WizardActionBar
            validationError={validationError ?? errorMessage}
            actionRef={validationRef}
          >
            <button className="btn-secondary" onClick={() => navigate("/form-b/step-2b")}>
              ← Back
            </button>
            <button className="btn" onClick={handleNext} disabled={loading}>
              Save & Next →
            </button>
          </WizardActionBar>
        </>
      )}
    </div>
  );
}
