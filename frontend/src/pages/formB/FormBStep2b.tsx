import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFormBStudyPlan,
  previewStudyPlanAnnexurePdf,
  readStoredFormBId,
  saveFormBStudyPlan,
  type FormBGroupDosingEntry,
  type FormBGroupEndpointEntry,
  type FormBGroupFateEntry,
  type FormBStudyGroupEntry,
  type FormBStudyPhaseEntry,
} from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import { getApprovedSpeciesOptions, getApprovedStrainsOptions, type LookupOption } from "../../api/lookupApi";
import { LoadingState } from "../../components/common/LoadingState";

const PHASE_CODES = [
  { value: "main", label: "Main study" },
  { value: "pilot", label: "Pilot" },
  { value: "pivotal", label: "Pivotal" },
  { value: "dose_finding", label: "Dose finding" },
  { value: "extension", label: "Extension" },
  { value: "other", label: "Other" },
];

const GROUP_ROLES = [
  { value: "control", label: "Control" },
  { value: "sham", label: "Sham" },
  { value: "treatment", label: "Treatment" },
  { value: "baseline", label: "Baseline" },
  { value: "other", label: "Other" },
];

const FATE_TYPES = [
  { value: "sacrifice", label: "Sacrifice" },
  { value: "euthanasia", label: "Euthanasia" },
  { value: "rehabilitation", label: "Rehabilitation" },
  { value: "reuse", label: "Reuse" },
  { value: "other", label: "Other" },
];

const ENDPOINT_PRESETS = [
  { code: "body_weight", name: "Body weight" },
  { code: "food_intake", name: "Food intake" },
  { code: "water_intake", name: "Water intake" },
  { code: "glucose", name: "Blood glucose" },
  { code: "cbc", name: "Complete blood count" },
  { code: "biochemistry", name: "Serum biochemistry" },
];

function emptyDosing(): FormBGroupDosingEntry {
  return { agent_name: "", dose: "", route: "", frequency: "", start_day: null, end_day: null };
}

function emptyEndpoint(): FormBGroupEndpointEntry {
  return {
    parameter_code: "body_weight",
    parameter_name: "Body weight",
    schedule_type: "recurring",
    schedule_detail: "Weekly",
  };
}

function emptyFate(count = 0): FormBGroupFateEntry {
  return { fate_type: "sacrifice", count, method_or_destination: "CO2", timing: "Study end" };
}

function emptyGroup(animalCount = 6): FormBStudyGroupEntry {
  return {
    group_code: "G1",
    group_name: "Control",
    role: "control",
    animal_count: animalCount,
    species_id: null,
    strain_id: null,
    sex: "Both",
    age: "8-10 weeks",
    weight_range: "200-250 g",
    feeding_diet: "Standard pellet diet",
    housing_notes: "",
    treatment_summary: "Vehicle control",
    dosing: [],
    endpoints: [emptyEndpoint()],
    fates: [emptyFate(animalCount)],
  };
}

function emptyPhase(order = 1, cap = 6): FormBStudyPhaseEntry {
  return {
    phase_code: order === 1 ? "pilot" : "pivotal",
    phase_name: order === 1 ? "Pilot phase" : "Pivotal phase",
    sequence_order: order,
    objective: "",
    planned_start_date: null,
    planned_duration_weeks: 4,
    animal_cap: cap,
    contingency_note: "",
    depends_on_sequence_order: order > 1 ? order - 1 : null,
    reuse_animals_allowed: false,
    groups: [emptyGroup(cap)],
  };
}

function defaultPlan(): { design_rationale: string; phases: FormBStudyPhaseEntry[] } {
  return { design_rationale: "", phases: [emptyPhase(1, 6)] };
}

function normalizePlan(data: FormBStudyPhaseEntry[] | undefined): FormBStudyPhaseEntry[] {
  if (!data?.length) return defaultPlan().phases;
  return data.map((phase) => ({
    ...phase,
    groups: phase.groups.map((group) => ({
      ...group,
      dosing: group.dosing ?? [],
      endpoints: group.endpoints?.length ? group.endpoints : [emptyEndpoint()],
      fates: group.fates?.length ? group.fates : [emptyFate(group.animal_count)],
    })),
  }));
}

export function FormBStep2b() {
  const navigate = useNavigate();
  const [formBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [designRationale, setDesignRationale] = useState("");
  const [phases, setPhases] = useState<FormBStudyPhaseEntry[]>(defaultPlan().phases);
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
        const saved = await getFormBStudyPlan(formBId);
        if (!cancelled) {
          setDesignRationale(saved.design_rationale ?? "");
          setPhases(normalizePlan(saved.phases as FormBStudyPhaseEntry[]));
        }
      } catch {
        if (!cancelled) {
          setPhases(defaultPlan().phases);
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
    () => phases.reduce((sum, phase) => sum + Number(phase.animal_cap || 0), 0),
    [phases],
  );

  async function loadStrains(speciesId: number) {
    if (strainCache[speciesId]) return;
    const strains = await getApprovedStrainsOptions(speciesId);
    setStrainCache((current) => ({ ...current, [speciesId]: strains }));
  }

  function updatePhase(index: number, patch: Partial<FormBStudyPhaseEntry>) {
    setPhases((current) =>
      current.map((phase, i) => (i === index ? { ...phase, ...patch } : phase)),
    );
  }

  function updateGroup(phaseIndex: number, groupIndex: number, patch: Partial<FormBStudyGroupEntry>) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const groups = phase.groups.map((group, gi) =>
          gi === groupIndex ? { ...group, ...patch } : group,
        );
        return { ...phase, groups };
      }),
    );
  }

  function addPhase() {
    setPhases((current) => [...current, emptyPhase(current.length + 1, 10)]);
  }

  function addGroup(phaseIndex: number) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const nextIndex = phase.groups.length + 1;
        return {
          ...phase,
          groups: [...phase.groups, { ...emptyGroup(6), group_code: `G${nextIndex}`, group_name: `Group ${nextIndex}` }],
        };
      }),
    );
  }

  function validateLocally(): string | null {
    if (!phases.length) return "Add at least one study phase.";
    for (const phase of phases) {
      if (!phase.phase_name.trim()) return "Every phase needs a name.";
      if (phase.animal_cap <= 0) return `Phase "${phase.phase_name}" needs a positive animal cap.`;
      if (!phase.groups.length) return `Phase "${phase.phase_name}" needs at least one group.`;
      const groupTotal = phase.groups.reduce((sum, group) => sum + group.animal_count, 0);
      if (groupTotal !== phase.animal_cap) {
        return `Phase "${phase.phase_name}": group totals (${groupTotal}) must equal phase cap (${phase.animal_cap}).`;
      }
      for (const group of phase.groups) {
        if (!group.group_code.trim() || !group.group_name.trim()) {
          return "Every group needs a code and name.";
        }
        const fateTotal = group.fates.reduce((sum, fate) => sum + fate.count, 0);
        if (fateTotal !== group.animal_count) {
          return `Group "${group.group_name}": fate counts (${fateTotal}) must equal group size (${group.animal_count}).`;
        }
      }
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

    setLoading(true);
    setErrorMessage(null);
    try {
      await saveFormBStudyPlan({
        form_b_id: formBId,
        design_rationale: designRationale.trim(),
        phases,
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
    try {
      await saveFormBStudyPlan({ form_b_id: formBId, design_rationale: designRationale.trim(), phases });
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
        <p>Annexure I: structured experimental study plan (phases, groups, dosing, endpoints, disposition).</p>
      </header>

      {!formBId && <p className="error-text">Form B ID not found. Please complete Step 1 first.</p>}
      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      {formBId && (
        <>
          <p>
            <strong>Total animals across phases:</strong> {totalAnimals}
          </p>

          <label className="full-width">
            Design rationale (optional)
            <textarea
              value={designRationale}
              onChange={(e) => setDesignRationale(e.target.value)}
              placeholder="Randomization, blinding, crossover logic, etc."
            />
          </label>

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
                  Sequence order
                  <input
                    type="number"
                    min={1}
                    value={phase.sequence_order}
                    onChange={(e) => updatePhase(phaseIndex, { sequence_order: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Animal cap (this phase)
                  <input
                    type="number"
                    min={1}
                    value={phase.animal_cap}
                    onChange={(e) => updatePhase(phaseIndex, { animal_cap: Number(e.target.value) })}
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
                <label className="full-width">
                  Contingency / gate (e.g. pivotal only after pilot success)
                  <textarea
                    value={phase.contingency_note ?? ""}
                    onChange={(e) => updatePhase(phaseIndex, { contingency_note: e.target.value })}
                  />
                </label>
                <label>
                  Depends on phase order
                  <select
                    value={phase.depends_on_sequence_order ?? ""}
                    onChange={(e) =>
                      updatePhase(phaseIndex, {
                        depends_on_sequence_order: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  >
                    <option value="">None</option>
                    {phases
                      .filter((item) => item.sequence_order < phase.sequence_order)
                      .map((item) => (
                        <option key={item.sequence_order} value={item.sequence_order}>
                          Phase {item.sequence_order}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Reuse animals from prior phase
                  <select
                    value={phase.reuse_animals_allowed ? "yes" : "no"}
                    onChange={(e) =>
                      updatePhase(phaseIndex, { reuse_animals_allowed: e.target.value === "yes" })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
              </div>

              {phase.groups.map((group, groupIndex) => (
                <div key={`${phase.sequence_order}-${group.group_code}`} className="page-section nested-section">
                  <h4>
                    Group {group.group_code}: {group.group_name} (n={group.animal_count})
                  </h4>
                  <div className="form-grid">
                    <label>
                      Group code
                      <input
                        value={group.group_code}
                        onChange={(e) => updateGroup(phaseIndex, groupIndex, { group_code: e.target.value })}
                      />
                    </label>
                    <label>
                      Group name
                      <input
                        value={group.group_name}
                        onChange={(e) => updateGroup(phaseIndex, groupIndex, { group_name: e.target.value })}
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
                        onChange={(e) => {
                          const count = Number(e.target.value);
                          updateGroup(phaseIndex, groupIndex, {
                            animal_count: count,
                            fates: group.fates.length === 1
                              ? [{ ...group.fates[0], count }]
                              : group.fates,
                          });
                        }}
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
                    <label>
                      Sex
                      <input value={group.sex ?? ""} onChange={(e) => updateGroup(phaseIndex, groupIndex, { sex: e.target.value })} />
                    </label>
                    <label>
                      Age
                      <input value={group.age ?? ""} onChange={(e) => updateGroup(phaseIndex, groupIndex, { age: e.target.value })} />
                    </label>
                    <label>
                      Weight range
                      <input
                        value={group.weight_range ?? ""}
                        onChange={(e) => updateGroup(phaseIndex, groupIndex, { weight_range: e.target.value })}
                      />
                    </label>
                    <label>
                      Diet
                      <input
                        value={group.feeding_diet ?? ""}
                        onChange={(e) => updateGroup(phaseIndex, groupIndex, { feeding_diet: e.target.value })}
                      />
                    </label>
                    <label className="full-width">
                      Treatment summary
                      <textarea
                        value={group.treatment_summary ?? ""}
                        onChange={(e) => updateGroup(phaseIndex, groupIndex, { treatment_summary: e.target.value })}
                      />
                    </label>
                  </div>

                  <details>
                    <summary>Dosing schedule</summary>
                    {group.dosing.map((dose, doseIndex) => (
                      <div key={doseIndex} className="form-grid">
                        <label>
                          Agent
                          <input
                            value={dose.agent_name}
                            onChange={(e) => {
                              const dosing = [...group.dosing];
                              dosing[doseIndex] = { ...dose, agent_name: e.target.value };
                              updateGroup(phaseIndex, groupIndex, { dosing });
                            }}
                          />
                        </label>
                        <label>
                          Dose
                          <input
                            value={dose.dose}
                            onChange={(e) => {
                              const dosing = [...group.dosing];
                              dosing[doseIndex] = { ...dose, dose: e.target.value };
                              updateGroup(phaseIndex, groupIndex, { dosing });
                            }}
                          />
                        </label>
                        <label>
                          Route
                          <input
                            value={dose.route}
                            onChange={(e) => {
                              const dosing = [...group.dosing];
                              dosing[doseIndex] = { ...dose, route: e.target.value };
                              updateGroup(phaseIndex, groupIndex, { dosing });
                            }}
                          />
                        </label>
                        <label>
                          Frequency
                          <input
                            value={dose.frequency}
                            onChange={(e) => {
                              const dosing = [...group.dosing];
                              dosing[doseIndex] = { ...dose, frequency: e.target.value };
                              updateGroup(phaseIndex, groupIndex, { dosing });
                            }}
                          />
                        </label>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        updateGroup(phaseIndex, groupIndex, { dosing: [...group.dosing, emptyDosing()] })
                      }
                    >
                      + Add dosing row
                    </button>
                  </details>

                  <details>
                    <summary>Parameters &amp; timelines</summary>
                    {group.endpoints.map((endpoint, endpointIndex) => (
                      <div key={endpointIndex} className="form-grid">
                        <label>
                          Parameter
                          <select
                            value={endpoint.parameter_code}
                            onChange={(e) => {
                              const preset = ENDPOINT_PRESETS.find((item) => item.code === e.target.value);
                              const endpoints = [...group.endpoints];
                              endpoints[endpointIndex] = {
                                ...endpoint,
                                parameter_code: e.target.value,
                                parameter_name: preset?.name ?? endpoint.parameter_name,
                              };
                              updateGroup(phaseIndex, groupIndex, { endpoints });
                            }}
                          >
                            {ENDPOINT_PRESETS.map((preset) => (
                              <option key={preset.code} value={preset.code}>{preset.name}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Schedule
                          <input
                            value={endpoint.schedule_detail}
                            onChange={(e) => {
                              const endpoints = [...group.endpoints];
                              endpoints[endpointIndex] = { ...endpoint, schedule_detail: e.target.value };
                              updateGroup(phaseIndex, groupIndex, { endpoints });
                            }}
                          />
                        </label>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        updateGroup(phaseIndex, groupIndex, { endpoints: [...group.endpoints, emptyEndpoint()] })
                      }
                    >
                      + Add parameter
                    </button>
                  </details>

                  <details open>
                    <summary>Animal disposition (sacrifice / rehab / reuse)</summary>
                    {group.fates.map((fate, fateIndex) => (
                      <div key={fateIndex} className="form-grid">
                        <label>
                          Fate
                          <select
                            value={fate.fate_type}
                            onChange={(e) => {
                              const fates = [...group.fates];
                              fates[fateIndex] = { ...fate, fate_type: e.target.value };
                              updateGroup(phaseIndex, groupIndex, { fates });
                            }}
                          >
                            {FATE_TYPES.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Count
                          <input
                            type="number"
                            min={0}
                            value={fate.count}
                            onChange={(e) => {
                              const fates = [...group.fates];
                              fates[fateIndex] = { ...fate, count: Number(e.target.value) };
                              updateGroup(phaseIndex, groupIndex, { fates });
                            }}
                          />
                        </label>
                        <label>
                          Method / destination
                          <input
                            value={fate.method_or_destination ?? ""}
                            onChange={(e) => {
                              const fates = [...group.fates];
                              fates[fateIndex] = { ...fate, method_or_destination: e.target.value };
                              updateGroup(phaseIndex, groupIndex, { fates });
                            }}
                          />
                        </label>
                        <label>
                          Timing
                          <input
                            value={fate.timing ?? ""}
                            onChange={(e) => {
                              const fates = [...group.fates];
                              fates[fateIndex] = { ...fate, timing: e.target.value };
                              updateGroup(phaseIndex, groupIndex, { fates });
                            }}
                          />
                        </label>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        updateGroup(phaseIndex, groupIndex, { fates: [...group.fates, emptyFate(0)] })
                      }
                    >
                      + Add fate row
                    </button>
                  </details>
                </div>
              ))}

              <button type="button" className="btn-secondary" onClick={() => addGroup(phaseIndex)}>
                + Add group to this phase
              </button>
            </section>
          ))}

          <div className="wizard-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn-secondary" onClick={addPhase}>
              + Add phase (pilot / pivotal)
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
