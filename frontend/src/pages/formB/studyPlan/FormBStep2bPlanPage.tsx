import { useNavigate } from "react-router-dom";
import { ENDPOINT_SCHEDULE_TYPES } from "../../../constants/formBStudyPlan";
import { FormRequiredLegend } from "../../../components/common/FormRequiredLegend";
import { WizardActionBar } from "../../../components/common/WizardActionBar";
import { FormBProjectSpeciesStrainSection } from "../../../components/formB/FormBProjectSpeciesStrainSection";
import { FormBWizardPageHeader } from "../../../components/formB/FormBWizardPageHeader";
import { PHASE_CODES } from "./formBStudyPlanModel";
import { studyPlanStepUrl, useFormBStudyPlan } from "./FormBStudyPlanContext";

export function FormBStep2bPlanPage() {
  const navigate = useNavigate();
  const {
    formBId,
    submitted,
    loading,
    validationRef,
    validationError,
    errorMessage,
    showValidationError,
    phases,
    projectSpeciesStrain,
    handleProjectSpeciesStrainChange,
    speciesOptions,
    ensureStrainsLoaded,
    strainsForSpecies,
    strainsLoading,
    totalAnimals,
    animalSummary,
    designRationale,
    setDesignRationale,
    updatePhase,
    addPhase,
    updateEndpoint,
    addEndpoint,
    removeEndpoint,
    validatePhases,
    trySaveProgress,
    previewAnnexurePdf,
  } = useFormBStudyPlan();

  async function continueToGroups() {
    const phaseError = validatePhases();
    if (phaseError) {
      showValidationError(phaseError);
      return;
    }
    const progress = await trySaveProgress({ requireRationale: false });
    if (progress.message && !progress.saved) {
      showValidationError(progress.message);
    }
    navigate(studyPlanStepUrl("groups", formBId));
  }

  return (
    <div className="page-card">
      <FormBWizardPageHeader
        stepId="step-2b"
        formBId={formBId}
        submitted={submitted}
        title="Form B – Step 2b (1 of 3): Study plan"
        subtitle="Phases and parameters only — groups and justification are on the next pages."
      />

      <FormRequiredLegend />

      {!formBId && <p className="error-text">Form B ID not found. Please complete Step 1 first.</p>}

      {formBId && (
        <>
          <div className="summary-card" style={{ marginBottom: "1rem" }}>
            <h4>Animals in plan (from groups)</h4>
            <p>{totalAnimals}</p>
            <p className="field-help">
              Sacrificed/euthanized: {animalSummary.sacrificed} · Rehabilitated:{" "}
              {animalSummary.rehabilitated}
            </p>
          </div>

          <label className="full-width page-section">
            Overall design rationale (how phases fit together)
            <textarea
              value={designRationale}
              onChange={(e) => setDesignRationale(e.target.value)}
              rows={3}
              placeholder="e.g. Pilot dose-finding, then pivotal efficacy with the chosen dose."
            />
          </label>

          <FormBProjectSpeciesStrainSection
            value={projectSpeciesStrain}
            speciesOptions={speciesOptions}
            ensureStrainsLoaded={ensureStrainsLoaded}
            strainsForSpecies={strainsForSpecies}
            strainsLoading={strainsLoading}
            onChange={handleProjectSpeciesStrainChange}
          />

          {phases.map((phase, phaseIndex) => (
            <section key={`phase-${phase.sequence_order}`} className="page-section" style={{ marginTop: "1rem" }}>
              <h3>
                Phase {phase.sequence_order}: {phase.phase_name || "Untitled"}
              </h3>
              <p className="field-help">
                {phase.groups.length} group(s), {phase.animal_cap} animals — edit groups on the next
                page.
              </p>
              <div className="form-grid">
                <label>
                  Phase type
                  <select
                    value={phase.phase_code}
                    onChange={(e) => updatePhase(phaseIndex, { phase_code: e.target.value })}
                  >
                    {PHASE_CODES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Phase name
                  <input
                    value={phase.phase_name}
                    onChange={(e) => updatePhase(phaseIndex, { phase_name: e.target.value })}
                  />
                </label>
                <label>
                  Planned start
                  <input
                    type="date"
                    value={phase.planned_start_date ?? ""}
                    onChange={(e) =>
                      updatePhase(phaseIndex, { planned_start_date: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  Duration (weeks)
                  <input
                    type="number"
                    min={1}
                    value={phase.planned_duration_weeks ?? ""}
                    onChange={(e) =>
                      updatePhase(phaseIndex, {
                        planned_duration_weeks: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </label>
                <label className="full-width">
                  Phase objective
                  <textarea
                    value={phase.objective ?? ""}
                    onChange={(e) => updatePhase(phaseIndex, { objective: e.target.value })}
                  />
                </label>
              </div>

              <div className="page-section nested-section" style={{ marginTop: "0.75rem" }}>
                <h4>Evaluation parameters (all groups in this phase)</h4>
                <table className="data-table compact-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Frequency type</th>
                      <th>Frequency / schedule</th>
                      <th>Method (optional)</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {phase.endpoints.map((endpoint, endpointIndex) => (
                      <tr key={`endpoint-${phaseIndex}-${endpointIndex}`}>
                        <td>
                          <input
                            value={endpoint.parameter_name}
                            onChange={(e) =>
                              updateEndpoint(phaseIndex, endpointIndex, {
                                parameter_name: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={endpoint.schedule_type}
                            onChange={(e) =>
                              updateEndpoint(phaseIndex, endpointIndex, {
                                schedule_type: e.target.value,
                              })
                            }
                          >
                            {ENDPOINT_SCHEDULE_TYPES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={endpoint.schedule_detail}
                            onChange={(e) =>
                              updateEndpoint(phaseIndex, endpointIndex, {
                                schedule_detail: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={endpoint.method ?? ""}
                            onChange={(e) =>
                              updateEndpoint(phaseIndex, endpointIndex, { method: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-link danger"
                            onClick={() => removeEndpoint(phaseIndex, endpointIndex)}
                            disabled={phase.endpoints.length <= 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="btn-secondary" onClick={() => addEndpoint(phaseIndex)}>
                  + Add parameter
                </button>
              </div>

              <div className="page-section nested-section" style={{ marginTop: "0.75rem" }}>
                <h4>Blood withdrawal & surgery</h4>
                <p className="field-help">Defaults are &quot;Not applicable&quot; / &quot;None&quot; if unchanged.</p>
                <div className="form-grid">
                  <label className="full-width">
                    Amount of blood to be withdrawn
                    <input
                      value={phase.blood_withdrawal_volume ?? ""}
                      onChange={(e) =>
                        updatePhase(phaseIndex, { blood_withdrawal_volume: e.target.value })
                      }
                      placeholder='e.g. 0.5 ml per draw, or "Not applicable"'
                    />
                  </label>
                  <label className="full-width">
                    Site of blood withdrawal
                    <input
                      value={phase.blood_withdrawal_site ?? ""}
                      onChange={(e) =>
                        updatePhase(phaseIndex, { blood_withdrawal_site: e.target.value })
                      }
                      placeholder='e.g. Retro-orbital, or "Not applicable"'
                    />
                  </label>
                  <label className="full-width">
                    Surgical procedure, if any
                    <textarea
                      value={phase.surgical_procedure ?? ""}
                      onChange={(e) =>
                        updatePhase(phaseIndex, { surgical_procedure: e.target.value })
                      }
                      placeholder='e.g. Laparotomy under isoflurane, or "None"'
                      rows={2}
                    />
                  </label>
                </div>
              </div>
            </section>
          ))}

          <div className="wizard-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn-secondary" onClick={addPhase}>
              + Add phase
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void previewAnnexurePdf()}
              disabled={loading}
            >
              Preview Annexure I PDF
            </button>
          </div>

          <WizardActionBar validationError={validationError ?? errorMessage} actionRef={validationRef}>
            <button type="button" className="btn-secondary" onClick={() => navigate("/form-b/step-2")}>
              ← Back
            </button>
            <button type="button" className="btn" onClick={() => void continueToGroups()} disabled={loading}>
              Continue to study groups →
            </button>
          </WizardActionBar>
        </>
      )}
    </div>
  );
}
