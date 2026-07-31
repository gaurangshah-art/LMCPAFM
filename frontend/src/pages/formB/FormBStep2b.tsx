import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFormBReview,
  getFormBStudyPlan,
  previewStudyPlanAnnexurePdf,
  readStoredFormBId,
  saveFormBStudyPlan,
  type FormBGroupDosingEntry,
  type FormBGroupFateEntry,
  type FormBStudyGroupEntry,
  type FormBStudyPhaseEntry,
} from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import { getApprovedSpeciesOptions, getApprovedStrainsOptions, type LookupOption } from "../../api/lookupApi";
import { LoadingState } from "../../components/common/LoadingState";

const PHASE_CODES = [
  { value: "pilot", label: "Pilot" },
  { value: "main", label: "Main study" },
  { value: "pivotal", label: "Pivotal" },
  { value: "dose_finding", label: "Dose finding" },
  { value: "extension", label: "Extension" },
  { value: "other", label: "Other" },
];

const GROUP_ROLES = [
  { value: "control", label: "Control / vehicle" },
  { value: "treatment", label: "Treatment" },
  { value: "sham", label: "Sham" },
  { value: "other", label: "Other" },
];

function emptyDosing(): FormBGroupDosingEntry {
  return {
    agent_name: "",
    dose: "",
    route: "",
    frequency: "",
    duration: "",
  };
}

function defaultFate(count: number): FormBGroupFateEntry[] {
  return [
    {
      fate_type: "sacrifice",
      count,
      method_or_destination: "As per IAEC-approved protocol",
      timing: "End of phase",
    },
  ];
}

function emptyGroup(animalCount = 6): FormBStudyGroupEntry {
  return {
    group_code: "G1",
    group_name: "Group 1",
    role: "control",
    animal_count: animalCount,
    species_id: null,
    strain_id: null,
    sex: "Both",
    age: "8-10 weeks",
    weight_range: "200-250 g",
    feeding_diet: "Standard pellet diet",
    housing_notes: "",
    treatment_summary: "",
    dosing: [emptyDosing()],
    endpoints: [],
    fates: defaultFate(animalCount),
  };
}

function emptyPhase(order = 1): FormBStudyPhaseEntry {
  const groups = [emptyGroup(6)];
  return {
    phase_code: order === 1 ? "pilot" : "main",
    phase_name: order === 1 ? "Phase 1" : `Phase ${order}`,
    sequence_order: order,
    objective: "",
    planned_start_date: null,
    planned_duration_weeks: 4,
    animal_cap: groups.reduce((sum, group) => sum + group.animal_count, 0),
    contingency_note: "",
    depends_on_sequence_order: null,
    reuse_animals_allowed: false,
    groups,
  };
}

function normalizePlan(data: FormBStudyPhaseEntry[] | undefined): FormBStudyPhaseEntry[] {
  if (!data?.length) return [emptyPhase(1)];
  return data.map((phase, index) => {
    const groups = phase.groups.map((group) => ({
      ...group,
      dosing: group.dosing?.length
        ? group.dosing.map((dose) => ({ ...emptyDosing(), ...dose, duration: dose.duration ?? "" }))
        : [emptyDosing()],
      endpoints: group.endpoints ?? [],
      fates: group.fates?.length ? group.fates : defaultFate(group.animal_count),
    }));
    const animalCap = groups.reduce((sum, group) => sum + group.animal_count, 0);
    return {
      ...phase,
      sequence_order: phase.sequence_order || index + 1,
      animal_cap: animalCap,
      groups,
    };
  });
}

function sumStep3Requested(step3: Record<string, unknown> | null | undefined): number | null {
  const requirements = step3?.requirements;
  if (!Array.isArray(requirements) || !requirements.length) return null;
  return requirements.reduce((sum, row) => {
    const count = Number((row as { number_required?: number }).number_required ?? 0);
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);
}

export function FormBStep2b() {
  const navigate = useNavigate();
  const [formBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [designRationale, setDesignRationale] = useState("");
  const [phases, setPhases] = useState<FormBStudyPhaseEntry[]>([emptyPhase(1)]);
  const [step3RequestedTotal, setStep3RequestedTotal] = useState<number | null>(null);
  const [speciesOptions, setSpeciesOptions] = useState<LookupOption[]>([]);
  const [strainCache, setStrainCache] = useState<Record<number, LookupOption[]>>({});

  useEffect(() => {
    getApprovedSpeciesOptions().then(setSpeciesOptions).catch(() => setSpeciesOptions([]));
  }, []);

  useEffect(() => {
    if (!formBId) {
      setLoadingSaved(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [saved, review] = await Promise.all([
          getFormBStudyPlan(formBId),
          getFormBReview(formBId).catch(() => null),
        ]);
        if (!cancelled) {
          setDesignRationale(saved.design_rationale ?? "");
          setPhases(normalizePlan(saved.phases as FormBStudyPhaseEntry[]));
          setStep3RequestedTotal(sumStep3Requested(review?.step3 as Record<string, unknown> | undefined));
        }
      } catch {
        if (!cancelled) {
          setPhases([emptyPhase(1)]);
        }
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formBId]);

  const totalAnimals = useMemo(
    () =>
      phases.reduce(
        (sum, phase) => sum + phase.groups.reduce((groupSum, group) => groupSum + group.animal_count, 0),
        0,
      ),
    [phases],
  );

  async function loadStrains(speciesId: number) {
    if (strainCache[speciesId]) return;
    const strains = await getApprovedStrainsOptions(speciesId);
    setStrainCache((current) => ({ ...current, [speciesId]: strains }));
  }

  function syncPhaseCap(phase: FormBStudyPhaseEntry): FormBStudyPhaseEntry {
    const animalCap = phase.groups.reduce((sum, group) => sum + group.animal_count, 0);
    return { ...phase, animal_cap: animalCap };
  }

  function updatePhase(index: number, patch: Partial<FormBStudyPhaseEntry>) {
    setPhases((current) =>
      current.map((phase, i) => (i === index ? syncPhaseCap({ ...phase, ...patch }) : phase)),
    );
  }

  function updateGroup(phaseIndex: number, groupIndex: number, patch: Partial<FormBStudyGroupEntry>) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const groups = phase.groups.map((group, gi) => {
          if (gi !== groupIndex) return group;
          const next = { ...group, ...patch };
          if (patch.animal_count != null) {
            next.fates = defaultFate(patch.animal_count);
          }
          return next;
        });
        return syncPhaseCap({ ...phase, groups });
      }),
    );
  }

  function addPhase() {
    setPhases((current) => [...current, emptyPhase(current.length + 1)]);
  }

  function addGroup(phaseIndex: number) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const nextIndex = phase.groups.length + 1;
        const groups = [
          ...phase.groups,
          {
            ...emptyGroup(6),
            group_code: `G${nextIndex}`,
            group_name: `Group ${nextIndex}`,
          },
        ];
        return syncPhaseCap({ ...phase, groups });
      }),
    );
  }

  function validateLocally(): string | null {
    if (!phases.length) return "Add at least one study phase.";
    for (const phase of phases) {
      if (!phase.phase_name.trim()) return "Every phase needs a name.";
      if (!phase.objective?.trim()) return `Phase "${phase.phase_name}" needs an objective.`;
      if (!phase.planned_start_date) {
        return `Phase "${phase.phase_name}" needs a planned start date.`;
      }
      if (!phase.planned_duration_weeks || phase.planned_duration_weeks <= 0) {
        return `Phase "${phase.phase_name}" needs a planned duration in weeks.`;
      }
      if (!phase.groups.length) return `Phase "${phase.phase_name}" needs at least one group.`;

      for (const group of phase.groups) {
        if (!group.group_name.trim()) return "Every group needs a title.";
        if (group.animal_count <= 0) return `Group "${group.group_name}" needs a positive animal count.`;
        if (!group.species_id || !group.strain_id) {
          return `Group "${group.group_name}": species and strain are required.`;
        }
        if (group.role === "treatment" || group.role === "sham") {
          const dose = group.dosing[0];
          if (
            !dose?.agent_name.trim() ||
            !dose.dose.trim() ||
            !dose.route.trim() ||
            !dose.frequency.trim() ||
            !dose.duration.trim()
          ) {
            return `Group "${group.group_name}": complete drug, dose, route, frequency, and duration.`;
          }
        }
      }
    }

    if (step3RequestedTotal != null && totalAnimals !== step3RequestedTotal) {
      return (
        `Total animals in all groups (${totalAnimals}) must match Step 3 requested total ` +
        `(${step3RequestedTotal}). Complete Step 3 first or adjust group counts.`
      );
    }

    return null;
  }

  async function handleSave(nextPath?: string) {
    if (!formBId) {
      alert("Form B ID missing.");
      return;
    }
    const error = validateLocally();
    if (error) {
      alert(error);
      return;
    }

    const payloadPhases = phases.map((phase) =>
      syncPhaseCap({
        ...phase,
        groups: phase.groups.map((group) => ({
          ...group,
          dosing:
            group.role === "control" && !group.dosing[0]?.agent_name.trim()
              ? []
              : group.dosing.slice(0, 1),
          endpoints: [],
          fates: defaultFate(group.animal_count),
        })),
      }),
    );

    setLoading(true);
    setErrorMessage(null);
    try {
      await saveFormBStudyPlan({
        form_b_id: formBId,
        design_rationale: designRationale.trim() || "Preclinical study plan",
        phases: payloadPhases,
      });
      if (nextPath) navigate(nextPath);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewPdf() {
    if (!formBId) return;
    const error = validateLocally();
    if (error) {
      alert(error);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const payloadPhases = phases.map((phase) =>
        syncPhaseCap({
          ...phase,
          groups: phase.groups.map((group) => ({
            ...group,
            dosing:
              group.role === "control" && !group.dosing[0]?.agent_name.trim()
                ? []
                : group.dosing.slice(0, 1),
            endpoints: [],
            fates: defaultFate(group.animal_count),
          })),
        }),
      );
      await saveFormBStudyPlan({
        form_b_id: formBId,
        design_rationale: designRationale.trim() || "Preclinical study plan",
        phases: payloadPhases,
      });
      await previewStudyPlanAnnexurePdf(formBId);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loadingSaved) {
    return <LoadingState label="Loading study plan..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 2b</h2>
        <p>
          Preclinical study plan: define phases and experimental groups (title, treatment, animals
          per group). Totals must match Step 3 animal requirements when that step is completed.
        </p>
      </header>

      {!formBId && <p className="error-text">Form B ID not found. Please complete Step 1 first.</p>}
      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      {formBId && (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <h4>Animals in study plan</h4>
              <p>{totalAnimals}</p>
            </div>
            <div className="summary-card">
              <h4>Step 3 requested total</h4>
              <p>{step3RequestedTotal ?? "Complete Step 3 to compare"}</p>
            </div>
          </div>

          {phases.map((phase, phaseIndex) => (
            <section key={`phase-${phase.sequence_order}`} className="page-section" style={{ marginTop: "1rem" }}>
              <h3>
                Phase {phase.sequence_order}: {phase.phase_name || "Untitled"}
              </h3>
              <div className="form-grid">
                <label>
                  Phase type
                  <select
                    value={phase.phase_code}
                    onChange={(e) => updatePhase(phaseIndex, { phase_code: e.target.value })}
                  >
                    {PHASE_CODES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
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
                    onChange={(e) => updatePhase(phaseIndex, { planned_start_date: e.target.value || null })}
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

              {phase.groups.map((group, groupIndex) => {
                const dose = group.dosing[0] ?? emptyDosing();
                return (
                  <div key={`${phase.sequence_order}-${group.group_code}`} className="page-section nested-section">
                    <h4>{group.group_name || "Untitled group"} (n={group.animal_count})</h4>
                    <div className="form-grid">
                      <label>
                        Group title
                        <input
                          value={group.group_name}
                          onChange={(e) =>
                            updateGroup(phaseIndex, groupIndex, {
                              group_name: e.target.value,
                              group_code: e.target.value.slice(0, 20) || group.group_code,
                            })
                          }
                        />
                      </label>
                      <label>
                        Role
                        <select
                          value={group.role}
                          onChange={(e) => updateGroup(phaseIndex, groupIndex, { role: e.target.value })}
                        >
                          {GROUP_ROLES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Animals in group
                        <input
                          type="number"
                          min={1}
                          value={group.animal_count}
                          onChange={(e) =>
                            updateGroup(phaseIndex, groupIndex, { animal_count: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Species
                        <select
                          value={group.species_id ?? ""}
                          onChange={(e) => {
                            const speciesId = e.target.value ? Number(e.target.value) : null;
                            updateGroup(phaseIndex, groupIndex, { species_id: speciesId, strain_id: null });
                            if (speciesId) void loadStrains(speciesId);
                          }}
                        >
                          <option value="">Select species</option>
                          {speciesOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Strain
                        <select
                          value={group.strain_id ?? ""}
                          onChange={(e) =>
                            updateGroup(phaseIndex, groupIndex, {
                              strain_id: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          disabled={!group.species_id}
                        >
                          <option value="">Select strain</option>
                          {(group.species_id ? strainCache[group.species_id] ?? [] : []).map((option) => (
                            <option key={option.id} value={option.id}>{option.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="form-grid">
                      <label>
                        Drug / agent
                        <input
                          value={dose.agent_name}
                          onChange={(e) => {
                            const dosing = [{ ...dose, agent_name: e.target.value }];
                            updateGroup(phaseIndex, groupIndex, { dosing });
                          }}
                          placeholder={group.role === "control" ? "Vehicle / NA" : "Test compound"}
                        />
                      </label>
                      <label>
                        Dose
                        <input
                          value={dose.dose}
                          onChange={(e) => {
                            const dosing = [{ ...dose, dose: e.target.value }];
                            updateGroup(phaseIndex, groupIndex, { dosing });
                          }}
                        />
                      </label>
                      <label>
                        Route
                        <input
                          value={dose.route}
                          onChange={(e) => {
                            const dosing = [{ ...dose, route: e.target.value }];
                            updateGroup(phaseIndex, groupIndex, { dosing });
                          }}
                        />
                      </label>
                      <label>
                        Frequency
                        <input
                          value={dose.frequency}
                          onChange={(e) => {
                            const dosing = [{ ...dose, frequency: e.target.value }];
                            updateGroup(phaseIndex, groupIndex, { dosing });
                          }}
                        />
                      </label>
                      <label>
                        Duration
                        <input
                          value={dose.duration}
                          onChange={(e) => {
                            const dosing = [{ ...dose, duration: e.target.value }];
                            updateGroup(phaseIndex, groupIndex, { dosing });
                          }}
                          placeholder="e.g. 4 weeks"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}

              <button type="button" className="btn-secondary" onClick={() => addGroup(phaseIndex)}>
                + Add group to this phase
              </button>
              <p className="muted-text">
                Phase total: {phase.animal_cap} animals
              </p>
            </section>
          ))}

          <div className="wizard-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn-secondary" onClick={addPhase}>
              + Add phase
            </button>
            <button type="button" className="btn-secondary" onClick={() => void handlePreviewPdf()} disabled={loading}>
              Preview Annexure I PDF
            </button>
          </div>

          <div className="wizard-actions">
            <button className="btn-secondary" onClick={() => navigate("/form-b/step-2")}>
              ← Back
            </button>
            <button className="btn" onClick={() => void handleSave("/form-b/step-3")} disabled={loading}>
              Save & Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
