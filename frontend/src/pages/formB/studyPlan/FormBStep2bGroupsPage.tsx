import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FormRequiredLegend } from "../../../components/common/FormRequiredLegend";
import { WizardActionBar } from "../../../components/common/WizardActionBar";
import { FormBWizardPageHeader } from "../../../components/formB/FormBWizardPageHeader";
import { FormBStudyPlanGroupEditor } from "./FormBStudyPlanGroupEditor";
import { studyPlanStepUrl, useFormBStudyPlan } from "./FormBStudyPlanContext";

export function FormBStep2bGroupsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    formBId,
    submitted,
    loading,
    validationRef,
    validationError,
    errorMessage,
    showValidationError,
    phases,
    addGroup,
    validateGroups,
    validatePhases,
    trySaveProgress,
  } = useFormBStudyPlan();

  const phaseParam = Number(searchParams.get("phase") ?? "1");
  const initialIndex = Number.isFinite(phaseParam) && phaseParam > 0 ? phaseParam - 1 : 0;
  const [activePhaseIndex, setActivePhaseIndex] = useState(() =>
    Math.min(initialIndex, Math.max(phases.length - 1, 0)),
  );

  useEffect(() => {
    setActivePhaseIndex((current) => Math.min(current, Math.max(phases.length - 1, 0)));
  }, [phases.length]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("phase", String(activePhaseIndex + 1));
        return next;
      },
      { replace: true },
    );
  }, [activePhaseIndex, setSearchParams]);

  const activePhase = phases[activePhaseIndex];

  async function continueToRationale() {
    const phaseError = validatePhases();
    if (phaseError) {
      showValidationError(phaseError);
      navigate(studyPlanStepUrl("plan", formBId));
      return;
    }
    const groupError = validateGroups();
    if (groupError) {
      showValidationError(groupError);
      return;
    }
    const progress = await trySaveProgress({ requireRationale: false });
    if (progress.message && !progress.saved) {
      showValidationError(progress.message);
    }
    navigate(studyPlanStepUrl("rationale", formBId));
  }

  return (
    <div className="page-card">
      <FormBWizardPageHeader
        stepId="step-2b-groups"
        formBId={formBId}
        submitted={submitted}
        title="Form B – Step 2b (2 of 3): Study groups"
        subtitle="Define experimental groups one phase at a time. Your work is kept in this browser if you leave and return."
      />

      <FormRequiredLegend />

      {!formBId && <p className="error-text">Form B ID not found. Please complete Step 1 first.</p>}

      {formBId && activePhase && (
        <>
          <div className="quick-nav-grid dashboard-quick-actions" role="tablist" aria-label="Study phases">
            {phases.map((phase, index) => (
              <button
                key={`phase-tab-${phase.sequence_order}`}
                type="button"
                role="tab"
                aria-selected={index === activePhaseIndex}
                className={index === activePhaseIndex ? "btn" : "btn btn-secondary"}
                onClick={() => setActivePhaseIndex(index)}
              >
                Phase {phase.sequence_order}: {phase.groups.length} group(s)
              </button>
            ))}
          </div>

          <section className="page-section" style={{ marginTop: "1rem" }}>
            <h3>
              Phase {activePhase.sequence_order}: {activePhase.phase_name || "Untitled"}
            </h3>
            <p className="field-help">
              Phase total: {activePhase.animal_cap} animals across {activePhase.groups.length}{" "}
              group(s).
            </p>

            {activePhase.groups.map((group, groupIndex) => (
              <FormBStudyPlanGroupEditor
                key={`phase-${activePhaseIndex}-group-${groupIndex}`}
                phaseIndex={activePhaseIndex}
                groupIndex={groupIndex}
                group={group}
              />
            ))}

            <button
              type="button"
              className="btn-secondary"
              onClick={() => addGroup(activePhaseIndex)}
            >
              + Add group to this phase
            </button>
          </section>

          <WizardActionBar validationError={validationError ?? errorMessage} actionRef={validationRef}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(studyPlanStepUrl("plan", formBId))}
            >
              ← Back to plan
            </button>
            <button type="button" className="btn" onClick={() => void continueToRationale()} disabled={loading}>
              Continue to animal rationale →
            </button>
          </WizardActionBar>
        </>
      )}
    </div>
  );
}
