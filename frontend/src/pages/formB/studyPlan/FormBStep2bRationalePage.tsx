import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RequiredMark } from "../../../components/common/RequiredMark";
import type { FormBStudyPlanHazardChoice } from "../../../constants/formBStudyPlanHazard";
import { WizardActionBar } from "../../../components/common/WizardActionBar";
import { FormBWizardPageHeader } from "../../../components/formB/FormBWizardPageHeader";
import { formatProjectSpeciesStrainLabel } from "../../../constants/formBProjectSpeciesStrain";
import { studyPlanStepUrl, useFormBStudyPlan } from "./FormBStudyPlanContext";

export function FormBStep2bRationalePage() {
  const navigate = useNavigate();
  const {
    formBId,
    submitted,
    loading,
    validationRef,
    validationError,
    errorMessage,
    animalRationale,
    updateAnimalRationale,
    totalAnimals,
    saveToServer,
    specialHazards,
    setSpecialHazards,
    projectSpeciesStrain,
    speciesOptions,
    strainsForSpecies,
  } = useFormBStudyPlan();

  const speciesLabel = useMemo(
    () =>
      projectSpeciesStrain.enabled
        ? formatProjectSpeciesStrainLabel(
            projectSpeciesStrain,
            speciesOptions,
            strainsForSpecies,
          )
        : null,
    [projectSpeciesStrain, speciesOptions, strainsForSpecies],
  );

  const priorWorkHere = animalRationale.similarExperimentsInEstablishment.trim().toLowerCase();
  const needsNewExperimentJustification = priorWorkHere.startsWith("yes");

  function updateNumberJustification(text: string) {
    updateAnimalRationale({
      whyNumberEssential: text,
      numberJustification: text,
    });
  }

  return (
    <div className="page-card">
      <FormBWizardPageHeader
        stepId="step-2b-rationale"
        formBId={formBId}
        submitted={submitted}
        title="Form B – Step 2b (3 of 3): Justification & procurement"
        subtitle="Answers here appear in Form B and Annexure I. You do not re-enter them on a separate Step 3."
      />

      {!formBId && <p className="error-text">Form B ID not found. Please complete Step 1 first.</p>}

      {formBId && (
        <>
          <p className="field-help" role="note">
            Study total: <strong>{totalAnimals} animals</strong> (from your groups). Year-wise
            counts below must add up to this number.
          </p>

          <section className="page-section">
            <h3>Regulatory hazards</h3>
            <p className="field-help">
              If you select &quot;None&quot;, Step 7 will pre-fill that no AERB / IBSC / RCGM
              certificates apply (you can change it there if needed).
            </p>
            <label className="full-width">
              Radionuclides, infectious agents, recombinant DNA, or other IAEC-regulated hazardous
              agents in this study?
              <RequiredMark />
              <select
                value={specialHazards}
                onChange={(e) =>
                  setSpecialHazards(e.target.value as FormBStudyPlanHazardChoice)
                }
              >
                <option value="">Select</option>
                <option value="none">No — standard pharmacology / none of the above</option>
                <option value="yes">Yes — certificates / approvals required</option>
              </select>
            </label>
          </section>

          <section className="page-section" style={{ marginTop: "1rem" }}>
            <h3>Scientific justification (3Rs)</h3>
            <div className="form-grid">
              <label className="full-width">
                Why animals are needed, and what in vitro / alternative work was done
                <textarea
                  value={animalRationale.whyAnimalNecessary}
                  onChange={(e) =>
                    updateAnimalRationale({
                      whyAnimalNecessary: e.target.value,
                      inVitroStudyDetails: e.target.value,
                    })
                  }
                  rows={4}
                />
              </label>
              <label className="full-width">
                {speciesLabel
                  ? `Why ${speciesLabel} is an appropriate model`
                  : "Why the selected species / strain is appropriate"}
                <textarea
                  value={animalRationale.whySpeciesSelected}
                  onChange={(e) => updateAnimalRationale({ whySpeciesSelected: e.target.value })}
                  rows={3}
                />
              </label>
              <label className="full-width">
                Why {totalAnimals} animals are required (design, statistics, power)
                <textarea
                  value={animalRationale.whyNumberEssential}
                  onChange={(e) => updateNumberJustification(e.target.value)}
                  rows={3}
                />
              </label>
              <label className="full-width">
                Similar work at LMCP or elsewhere (brief; include references if known)
                <textarea
                  value={animalRationale.similarExperimentsElsewhere}
                  onChange={(e) =>
                    updateAnimalRationale({ similarExperimentsElsewhere: e.target.value })
                  }
                  rows={3}
                />
              </label>
              <label className="full-width">
                Has similar work been done in your establishment? (Yes / No and brief note)
                <textarea
                  value={animalRationale.similarExperimentsInEstablishment}
                  onChange={(e) =>
                    updateAnimalRationale({ similarExperimentsInEstablishment: e.target.value })
                  }
                  rows={2}
                />
              </label>
              {needsNewExperimentJustification ? (
                <label className="full-width">
                  Why is this new experiment required despite prior work at LMCP?
                  <textarea
                    value={animalRationale.justifyNewExperiment}
                    onChange={(e) =>
                      updateAnimalRationale({ justifyNewExperiment: e.target.value })
                    }
                    rows={2}
                  />
                </label>
              ) : null}
            </div>
          </section>

          <section className="page-section" style={{ marginTop: "1rem" }}>
            <h3>Procurement</h3>
            <div className="form-grid">
              <label>
                Source of animals
                <select
                  value={animalRationale.animalSource}
                  onChange={(e) => updateAnimalRationale({ animalSource: e.target.value })}
                >
                  <option value="">Select source</option>
                  <option value="Institutional Animal House">Institutional Animal House</option>
                  <option value="CPCSEA Registered Breeder">CPCSEA Registered Breeder</option>
                  <option value="Other IAEC-approved source">Other IAEC-approved source</option>
                </select>
              </label>
              <label>
                Days housed (per animal, typical)
                <input
                  type="number"
                  value={animalRationale.daysHoused || ""}
                  onChange={(e) => updateAnimalRationale({ daysHoused: Number(e.target.value) })}
                />
              </label>
              <label>
                Breeder name
                <RequiredMark />
                <input
                  value={animalRationale.breederName}
                  onChange={(e) => updateAnimalRationale({ breederName: e.target.value })}
                />
              </label>
              <label>
                Breeder registration number
                <RequiredMark />
                <input
                  value={animalRationale.breederRegistrationNumber}
                  onChange={(e) =>
                    updateAnimalRationale({ breederRegistrationNumber: e.target.value })
                  }
                />
              </label>
              <label className="full-width">
                Breeder address
                <RequiredMark />
                <textarea
                  value={animalRationale.breederAddress}
                  onChange={(e) => updateAnimalRationale({ breederAddress: e.target.value })}
                  rows={2}
                />
              </label>
              <label className="full-width">
                Year-wise animal use (total {totalAnimals})
                <div className="form-grid">
                  {animalRationale.yearWiseBreakup.map((row, index) => (
                    <div key={`year-${index}`} className="full-width form-grid">
                      <label>
                        Year
                        <input
                          value={row.year}
                          onChange={(e) => {
                            const next = [...animalRationale.yearWiseBreakup];
                            next[index] = { ...next[index], year: e.target.value };
                            updateAnimalRationale({ yearWiseBreakup: next });
                          }}
                        />
                      </label>
                      <label>
                        Count
                        <input
                          type="number"
                          value={row.count || ""}
                          onChange={(e) => {
                            const next = [...animalRationale.yearWiseBreakup];
                            next[index] = { ...next[index], count: Number(e.target.value) };
                            updateAnimalRationale({ yearWiseBreakup: next });
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </label>
            </div>
          </section>

          <WizardActionBar validationError={validationError ?? errorMessage} actionRef={validationRef}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(studyPlanStepUrl("groups", formBId))}
            >
              ← Back to groups
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void saveToServer("/form-b/step-4")}
              disabled={loading}
            >
              {loading ? "Saving…" : "Save & Next →"}
            </button>
          </WizardActionBar>
        </>
      )}
    </div>
  );
}
