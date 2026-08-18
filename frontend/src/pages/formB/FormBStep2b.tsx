import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFormBStudyPlan,
  previewStudyPlanAnnexurePdf,
  saveFormBStudyPlan,
  type FormBGroupDosingEntry,
  type FormBGroupEndpointEntry,
  type FormBGroupFateEntry,
  type FormBStudyGroupEntry,
  type FormBStudyPhaseEntry,
} from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import { getSpeciesOptions, type LookupOption } from "../../api/lookupApi";
import { useStrainLookup } from "../../hooks/useStrainLookup";
import {
  createEmptyAnimalRationale,
  parseAnimalRationale,
  serializeAnimalRationale,
  type FormBAnimalRationaleForm,
} from "../../constants/formBAnimalRationale";
import {
  buildStudyPlanPayloadPhases,
  computeAnimalSummary,
  defaultEndpoints,
  defaultFate,
  emptyEndpoint,
  ENDPOINT_SCHEDULE_TYPES,
  FATE_TYPE_OPTIONS,
} from "../../constants/formBStudyPlan";
import { LoadingState } from "../../components/common/LoadingState";
import { DraftRestoreBanner } from "../../components/common/DraftRestoreBanner";
import { FormRequiredLegend } from "../../components/common/FormRequiredLegend";
import { RequiredMark } from "../../components/common/RequiredMark";
import { WizardActionBar } from "../../components/common/WizardActionBar";
import { useFormDraftPersistence } from "../../hooks/useFormDraftPersistence";
import { useFormBEditRouteGuard } from "../../hooks/useFormBEditRouteGuard";
import { useResolvedFormBId } from "../../hooks/useResolvedFormBId";
import { useWizardValidation } from "../../hooks/useWizardValidation";

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

function toOptionalNumericId(value: number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
    endpoints: defaultEndpoints(),
    blood_withdrawal_volume: "",
    blood_withdrawal_site: "",
    surgical_procedure: "",
    groups,
  };
}

function normalizePlan(data: FormBStudyPhaseEntry[] | undefined): FormBStudyPhaseEntry[] {
  if (!data?.length) return [emptyPhase(1)];
  return data.map((phase, index) => {
    const legacyGroupEndpoints = phase.groups.find(
      (group) => (group as FormBStudyGroupEntry & { endpoints?: FormBGroupEndpointEntry[] }).endpoints?.length,
    ) as (FormBStudyGroupEntry & { endpoints?: FormBGroupEndpointEntry[] }) | undefined;
    const groups = phase.groups.map((group) => ({
      ...group,
      species_id: toOptionalNumericId(group.species_id),
      strain_id: toOptionalNumericId(group.strain_id),
      dosing: group.dosing?.length
        ? group.dosing.map((dose) => ({ ...emptyDosing(), ...dose, duration: dose.duration ?? "" }))
        : [emptyDosing()],
      fates: group.fates?.length ? group.fates : defaultFate(group.animal_count),
    }));
    const endpoints = phase.endpoints?.length
      ? phase.endpoints
      : legacyGroupEndpoints?.endpoints?.length
        ? legacyGroupEndpoints.endpoints
        : defaultEndpoints();
    const animalCap = groups.reduce((sum, group) => sum + group.animal_count, 0);
    return {
      ...phase,
      sequence_order: phase.sequence_order || index + 1,
      animal_cap: animalCap,
      endpoints,
      groups,
    };
  });
}

export function FormBStep2b() {
  const navigate = useNavigate();
  const { formBId, validating: resolvingFormB, submitted } = useResolvedFormBId();
  useFormBEditRouteGuard(formBId, submitted, resolvingFormB);
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { validationRef, validationError, showValidationError, clearValidationError } =
    useWizardValidation();
  const [designRationale, setDesignRationale] = useState("");
  const [animalRationale, setAnimalRationale] = useState<FormBAnimalRationaleForm>(
    createEmptyAnimalRationale(),
  );
  const [phases, setPhases] = useState<FormBStudyPhaseEntry[]>([emptyPhase(1)]);
  const [speciesOptions, setSpeciesOptions] = useState<LookupOption[]>([]);
  const speciesIdsInPlan = useMemo(
    () => phases.flatMap((phase) => phase.groups.map((group) => group.species_id)),
    [phases],
  );
  const { ensureStrainsLoaded, strainsForSpecies, strainsLoading } =
    useStrainLookup(speciesIdsInPlan);

  useEffect(() => {
    getSpeciesOptions().then(setSpeciesOptions).catch(() => setSpeciesOptions([]));
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
          setAnimalRationale(parseAnimalRationale(saved.animal_rationale ?? undefined));
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

  const animalSummary = useMemo(() => computeAnimalSummary(phases), [phases]);

  const step2bDraft = useMemo(
    () => ({ designRationale, animalRationale, phases }),
    [designRationale, animalRationale, phases],
  );

  const { restoreOffer, acceptRestore, dismissRestore, clearDraft } = useFormDraftPersistence({
    formBId,
    stepKey: "step2b",
    draft: step2bDraft,
    hydrated: !loadingSaved,
    applyDraft: (saved) => {
      setDesignRationale(saved.designRationale);
      setAnimalRationale(saved.animalRationale);
      setPhases(saved.phases);
    },
  });

  useEffect(() => {
    if (totalAnimals <= 0) return;
    setAnimalRationale((current) => {
      const breakup = current.yearWiseBreakup.length
        ? current.yearWiseBreakup.map((row, index) =>
            index === 0 ? { ...row, count: totalAnimals } : { ...row, count: 0 },
          )
        : [{ year: "", count: totalAnimals }];
      return { ...current, yearWiseBreakup: breakup };
    });
  }, [totalAnimals]);

  function updateAnimalRationale(patch: Partial<FormBAnimalRationaleForm>) {
    setAnimalRationale((current) => ({ ...current, ...patch }));
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
          if (patch.animal_count != null && next.fates.length === 1) {
            next.fates = [{ ...next.fates[0], count: patch.animal_count }];
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

  function updateEndpoint(
    phaseIndex: number,
    endpointIndex: number,
    patch: Partial<FormBGroupEndpointEntry>,
  ) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const endpoints = phase.endpoints.map((endpoint, ei) =>
          ei === endpointIndex ? { ...endpoint, ...patch } : endpoint,
        );
        return { ...phase, endpoints };
      }),
    );
  }

  function addEndpoint(phaseIndex: number) {
    setPhases((current) =>
      current.map((phase, pi) =>
        pi === phaseIndex
          ? { ...phase, endpoints: [...phase.endpoints, emptyEndpoint()] }
          : phase,
      ),
    );
  }

  function removeEndpoint(phaseIndex: number, endpointIndex: number) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const endpoints = phase.endpoints.filter((_, ei) => ei !== endpointIndex);
        return { ...phase, endpoints: endpoints.length ? endpoints : defaultEndpoints() };
      }),
    );
  }

  function updateFate(
    phaseIndex: number,
    groupIndex: number,
    fateIndex: number,
    patch: Partial<FormBGroupFateEntry>,
  ) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const groups = phase.groups.map((group, gi) => {
          if (gi !== groupIndex) return group;
          const fates = group.fates.map((fate, fi) =>
            fi === fateIndex ? { ...fate, ...patch } : fate,
          );
          return { ...group, fates };
        });
        return syncPhaseCap({ ...phase, groups });
      }),
    );
  }

  function addFate(phaseIndex: number, groupIndex: number) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const groups = phase.groups.map((group, gi) =>
          gi === groupIndex
            ? {
                ...group,
                fates: [
                  ...group.fates,
                  {
                    fate_type: "rehabilitation",
                    count: 0,
                    method_or_destination: "",
                    timing: "",
                  },
                ],
              }
            : group,
        );
        return syncPhaseCap({ ...phase, groups });
      }),
    );
  }

  function removeFate(phaseIndex: number, groupIndex: number, fateIndex: number) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const groups = phase.groups.map((group, gi) => {
          if (gi !== groupIndex) return group;
          const fates = group.fates.filter((_, fi) => fi !== fateIndex);
          return {
            ...group,
            fates: fates.length ? fates : defaultFate(group.animal_count),
          };
        });
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

      if (!phase.endpoints.length) {
        return `Phase "${phase.phase_name}": add at least one study evaluation parameter.`;
      }
      for (const endpoint of phase.endpoints) {
        if (!endpoint.parameter_name.trim()) {
          return `Phase "${phase.phase_name}": every evaluation parameter needs a name.`;
        }
        if (!endpoint.schedule_detail.trim()) {
          return `Phase "${phase.phase_name}": enter frequency/timing for "${endpoint.parameter_name}".`;
        }
      }

      if (!phase.blood_withdrawal_volume?.trim()) {
        return `Phase "${phase.phase_name}": enter amount of blood to be withdrawn (or "Not applicable").`;
      }
      if (!phase.blood_withdrawal_site?.trim()) {
        return `Phase "${phase.phase_name}": enter site of blood withdrawal (or "Not applicable").`;
      }
      if (!phase.surgical_procedure?.trim()) {
        return `Phase "${phase.phase_name}": describe any surgical procedure (or "None").`;
      }

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

        if (!group.fates.length) {
          return `Group "${group.group_name}": specify animal disposition (sacrificed, rehabilitated, etc.).`;
        }
        const fateTotal = group.fates.reduce((sum, fate) => sum + (fate.count || 0), 0);
        if (fateTotal !== group.animal_count) {
          return `Group "${group.group_name}": disposition counts (${fateTotal}) must equal animals in group (${group.animal_count}).`;
        }
      }
    }

    return null;
  }

  function validateAnimalRationale(): string | null {
    if (!animalRationale.whyAnimalNecessary.trim()) {
      return "Explain why animal usage is necessary.";
    }
    if (!animalRationale.inVitroStudyDetails.trim()) {
      return "Describe in vitro study status.";
    }
    if (!animalRationale.whySpeciesSelected.trim()) {
      return "Explain species selection.";
    }
    if (!animalRationale.whyNumberEssential.trim()) {
      return "Justify the number of animals.";
    }
    if (!animalRationale.similarExperimentsInEstablishment.trim()) {
      return "State whether similar experiments were conducted in your establishment.";
    }
    if (
      animalRationale.similarExperimentsInEstablishment.trim().toLowerCase().startsWith("yes") &&
      !animalRationale.justifyNewExperiment.trim()
    ) {
      return "Justify why a new experiment is required when similar work was done in your establishment.";
    }
    if (!animalRationale.similarExperimentsElsewhere.trim()) {
      return "Provide references for similar experiments elsewhere.";
    }
    if (!animalRationale.animalSource.trim()) return "Select the source of animals.";
    if (!animalRationale.daysHoused || animalRationale.daysHoused <= 0) {
      return "Enter the number of days each animal will be housed.";
    }
    if (!animalRationale.numberJustification.trim()) {
      return "Provide justification for the number of animals.";
    }
    if (!animalRationale.breederName.trim()) return "Breeder name is required.";
    if (!animalRationale.breederAddress.trim()) return "Breeder address is required.";
    if (!animalRationale.breederRegistrationNumber.trim()) {
      return "Breeder registration number is required.";
    }
    const breakupTotal = animalRationale.yearWiseBreakup.reduce(
      (sum, row) => sum + (row.count || 0),
      0,
    );
    if (breakupTotal !== totalAnimals) {
      return `Year-wise animal counts (${breakupTotal}) must equal the study plan total (${totalAnimals}).`;
    }
    for (let index = 0; index < animalRationale.yearWiseBreakup.length; index += 1) {
      const row = animalRationale.yearWiseBreakup[index];
      if (!row.year.trim()) return `Year ${index + 1} is required in the year-wise breakup.`;
      if (!row.count || row.count <= 0) {
        return `Year ${index + 1} must have a positive animal count.`;
      }
    }
    return null;
  }

  async function handleSave(nextPath?: string) {
    if (!formBId) {
      showValidationError("Form B ID missing.");
      return;
    }
    const planError = validateLocally();
    if (planError) {
      showValidationError(planError);
      return;
    }
    const rationaleError = validateAnimalRationale();
    if (rationaleError) {
      showValidationError(rationaleError);
      return;
    }

    const payloadPhases = buildStudyPlanPayloadPhases(phases, syncPhaseCap);

    clearValidationError();
    setLoading(true);
    setErrorMessage(null);
    try {
      await saveFormBStudyPlan({
        form_b_id: formBId,
        design_rationale: designRationale.trim() || "Preclinical study plan",
        phases: payloadPhases,
        animal_rationale: serializeAnimalRationale(animalRationale),
      });
      clearDraft();
      if (nextPath) navigate(nextPath);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      showValidationError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewPdf() {
    if (!formBId) return;
    const planError = validateLocally();
    if (planError) {
      showValidationError(planError);
      return;
    }
    const rationaleError = validateAnimalRationale();
    if (rationaleError) {
      showValidationError(rationaleError);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const payloadPhases = buildStudyPlanPayloadPhases(phases, syncPhaseCap);
      await saveFormBStudyPlan({
        form_b_id: formBId,
        design_rationale: designRationale.trim() || "Preclinical study plan",
        phases: payloadPhases,
        animal_rationale: serializeAnimalRationale(animalRationale),
      });
      await previewStudyPlanAnnexurePdf(formBId);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loadingSaved || resolvingFormB) {
    return <LoadingState label="Loading study plan..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 2b</h2>
        <p>
          Preclinical study plan and animal requirements: define phases, groups, and the rationale
          for animal use. Species and counts in each group are used automatically — no separate
          Step 3 is needed.
        </p>
        <p className="auth-note" role="note">
          Groups defined here are your <strong>proposal</strong> for IAEC review (Annexure I). After
          approval, they are copied into your project workspace as a starting point. If IAEC requests
          changes, update experiment groups in the project workspace — not in this submitted Form B.
        </p>
      </header>

      {restoreOffer ? (
        <DraftRestoreBanner onRestore={acceptRestore} onDismiss={dismissRestore} />
      ) : null}

      <FormRequiredLegend />

      {!formBId && <p className="error-text">Form B ID not found. Please complete Step 1 first.</p>}

      {formBId && (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <h4>Total animals in study plan</h4>
              <p>{totalAnimals}</p>
              <p className="field-help">Used for year-wise breakup and Annexure I.</p>
            </div>
            <div className="summary-card">
              <h4>Annexure I animal summary</h4>
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total used</td>
                    <td>{animalSummary.totalUsed}</td>
                  </tr>
                  <tr>
                    <td>Sacrificed / euthanized</td>
                    <td>{animalSummary.sacrificed}</td>
                  </tr>
                  <tr>
                    <td>Rehabilitated</td>
                    <td>{animalSummary.rehabilitated}</td>
                  </tr>
                  {(animalSummary.reused > 0 || animalSummary.other > 0) && (
                    <>
                      {animalSummary.reused > 0 ? (
                        <tr>
                          <td>Reused</td>
                          <td>{animalSummary.reused}</td>
                        </tr>
                      ) : null}
                      {animalSummary.other > 0 ? (
                        <tr>
                          <td>Other</td>
                          <td>{animalSummary.other}</td>
                        </tr>
                      ) : null}
                    </>
                  )}
                </tbody>
              </table>
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

              <div className="page-section nested-section" style={{ marginTop: "0.75rem" }}>
                <h4>Study evaluation parameters (required)</h4>
                <p className="field-help">
                  IAEC requires the parameters observed during this phase and how often they are
                  measured. These apply uniformly to all groups in the phase.
                </p>
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
                            placeholder="e.g. Body weight"
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
                            placeholder="e.g. Weekly, Day 14, Days 1-7"
                          />
                        </td>
                        <td>
                          <input
                            value={endpoint.method ?? ""}
                            onChange={(e) =>
                              updateEndpoint(phaseIndex, endpointIndex, {
                                method: e.target.value,
                              })
                            }
                            placeholder="e.g. Digital balance"
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
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => addEndpoint(phaseIndex)}
                >
                  + Add parameter
                </button>
              </div>

              <div className="page-section nested-section" style={{ marginTop: "0.75rem" }}>
                <h4>Blood withdrawal and surgical procedures (required)</h4>
                <p className="field-help">
                  IAEC requires the amount and site of blood withdrawal and any surgical
                  procedures for this phase. Enter &quot;Not applicable&quot; or &quot;None&quot; where
                  relevant.
                </p>
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
                          value={group.species_id != null ? String(group.species_id) : ""}
                          onChange={(e) => {
                            const speciesId = e.target.value ? Number(e.target.value) : null;
                            updateGroup(phaseIndex, groupIndex, { species_id: speciesId, strain_id: null });
                            if (speciesId) void ensureStrainsLoaded(speciesId);
                          }}
                        >
                          <option value="">Select species</option>
                          {speciesOptions.map((option) => (
                            <option key={option.id} value={String(option.id)}>{option.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Strain
                        <select
                          value={group.strain_id != null ? String(group.strain_id) : ""}
                          onChange={(e) =>
                            updateGroup(phaseIndex, groupIndex, {
                              strain_id: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          disabled={!group.species_id}
                        >
                          <option value="">
                            {!group.species_id
                              ? "Select species first"
                              : strainsLoading(group.species_id)
                                ? "Loading strains..."
                                : strainsForSpecies(group.species_id).length
                                  ? "Select strain"
                                  : "No strains for this species"}
                          </option>
                          {strainsForSpecies(group.species_id).map((option) => (
                            <option key={option.id} value={String(option.id)}>{option.name}</option>
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

                    <div className="page-section nested-section" style={{ marginTop: "0.75rem" }}>
                      <h5>Animal disposition</h5>
                      <p className="field-help">
                        How animals in this group will be used, sacrificed, or rehabilitated. Counts
                        must total {group.animal_count}.
                      </p>
                      <table className="data-table compact-table">
                        <thead>
                          <tr>
                            <th>Disposition</th>
                            <th>Count</th>
                            <th>Method / destination</th>
                            <th>Timing</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {group.fates.map((fate, fateIndex) => (
                            <tr key={`fate-${phaseIndex}-${groupIndex}-${fateIndex}`}>
                              <td>
                                <select
                                  value={fate.fate_type}
                                  onChange={(e) =>
                                    updateFate(phaseIndex, groupIndex, fateIndex, {
                                      fate_type: e.target.value,
                                    })
                                  }
                                >
                                  {FATE_TYPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min={0}
                                  value={fate.count}
                                  onChange={(e) =>
                                    updateFate(phaseIndex, groupIndex, fateIndex, {
                                      count: Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  value={fate.method_or_destination ?? ""}
                                  onChange={(e) =>
                                    updateFate(phaseIndex, groupIndex, fateIndex, {
                                      method_or_destination: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. CO2, adoption centre"
                                />
                              </td>
                              <td>
                                <input
                                  value={fate.timing ?? ""}
                                  onChange={(e) =>
                                    updateFate(phaseIndex, groupIndex, fateIndex, {
                                      timing: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. End of phase"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-link danger"
                                  onClick={() => removeFate(phaseIndex, groupIndex, fateIndex)}
                                  disabled={group.fates.length <= 1}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => addFate(phaseIndex, groupIndex)}
                      >
                        + Add disposition row
                      </button>
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

          <section className="page-section" style={{ marginTop: "1.5rem" }}>
            <h3>Animal use rationale</h3>
            <p className="field-help">
              These fields replace the old Step 3. Species, strain, sex, age, and counts come from
              the study groups above.
            </p>
            <div className="form-grid">
              <label className="full-width">
                Why is animal usage necessary for these studies?
                <textarea
                  value={animalRationale.whyAnimalNecessary}
                  onChange={(e) => updateAnimalRationale({ whyAnimalNecessary: e.target.value })}
                />
              </label>
              <label className="full-width">
                In vitro / alternative study details
                <textarea
                  value={animalRationale.inVitroStudyDetails}
                  onChange={(e) => updateAnimalRationale({ inVitroStudyDetails: e.target.value })}
                />
              </label>
              <label className="full-width">
                Why are the particular species selected?
                <textarea
                  value={animalRationale.whySpeciesSelected}
                  onChange={(e) => updateAnimalRationale({ whySpeciesSelected: e.target.value })}
                />
              </label>
              <label className="full-width">
                Why is the estimated number of animals essential?
                <textarea
                  value={animalRationale.whyNumberEssential}
                  onChange={(e) => updateAnimalRationale({ whyNumberEssential: e.target.value })}
                />
              </label>
              <label className="full-width">
                Have similar experiments been conducted in your establishment?
                <textarea
                  value={animalRationale.similarExperimentsInEstablishment}
                  onChange={(e) =>
                    updateAnimalRationale({ similarExperimentsInEstablishment: e.target.value })
                  }
                />
              </label>
              <label className="full-width">
                If yes, justify why a new experiment is required
                <textarea
                  value={animalRationale.justifyNewExperiment}
                  onChange={(e) => updateAnimalRationale({ justifyNewExperiment: e.target.value })}
                />
              </label>
              <label className="full-width">
                Similar experiments elsewhere (references)
                <textarea
                  value={animalRationale.similarExperimentsElsewhere}
                  onChange={(e) =>
                    updateAnimalRationale({ similarExperimentsElsewhere: e.target.value })
                  }
                />
              </label>
            </div>
          </section>

          <section className="page-section" style={{ marginTop: "1rem" }}>
            <h3>Procurement and housing</h3>
            <div className="form-grid">
              <label>
                Total animals (from study plan)
                <input type="number" value={totalAnimals} readOnly disabled />
              </label>
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
                Days each animal will be housed
                <input
                  type="number"
                  value={animalRationale.daysHoused || ""}
                  onChange={(e) =>
                    updateAnimalRationale({ daysHoused: Number(e.target.value) })
                  }
                />
              </label>
              <label className="full-width">
                Justification for number of animals
                <textarea
                  value={animalRationale.numberJustification}
                  onChange={(e) => updateAnimalRationale({ numberJustification: e.target.value })}
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
                />
              </label>
              <label className="full-width">
                Year-wise breakup (must total {totalAnimals})
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

          <WizardActionBar
            validationError={validationError ?? errorMessage}
            actionRef={validationRef}
          >
            <button type="button" className="btn-secondary" onClick={() => navigate("/form-b/step-2")}>
              ← Back
            </button>
            <button type="button" className="btn" onClick={() => void handleSave("/form-b/step-4")} disabled={loading}>
              {loading ? "Saving…" : "Save & Next →"}
            </button>
          </WizardActionBar>
        </>
      )}
    </div>
  );
}
