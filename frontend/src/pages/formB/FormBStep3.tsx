import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFormBStudyPlan,
  readStoredFormBId,
  saveFormBStep3,
  type FormBAnimalRequirementEntry,
  type FormBYearWiseCountEntry,
} from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import { getSpeciesOptions, getStrainsOptions, type LookupOption } from "../../api/lookupApi";
import { LoadingState } from "../../components/common/LoadingState";
import { INSTITUTIONAL_DEFAULTS } from "../../constants/institution";
import { readString, useFormBStepReview } from "../../hooks/useFormBStepReview";
import { validateWeightGrams } from "../../utils/businessValidation";

interface RequirementRow extends FormBAnimalRequirementEntry {
  id: string;
}

interface Step3Form {
  whyAnimalNecessary: string;
  inVitroStudyDetails: string;
  whySpeciesSelected: string;
  whyNumberEssential: string;
  similarExperimentsInEstablishment: string;
  justifyNewExperiment: string;
  similarExperimentsElsewhere: string;
  requirements: RequirementRow[];
}

function createEmptyYearRow(): FormBYearWiseCountEntry {
  return { year: "", count: 0 };
}

function createEmptyRequirement(): RequirementRow {
  return {
    id: crypto.randomUUID(),
    species: "",
    strain: "",
    sex: "",
    age: "",
    weight: "",
    number_required: 0,
    source: "",
    justification: "",
    year_wise_breakup: [createEmptyYearRow()],
    days_housed: 0,
    breeder_name: INSTITUTIONAL_DEFAULTS.establishmentName,
    breeder_address: INSTITUTIONAL_DEFAULTS.establishmentAddress,
    breeder_registration_number: INSTITUTIONAL_DEFAULTS.registrationNumber,
  };
}

const EMPTY_FORM: Step3Form = {
  whyAnimalNecessary: "",
  inVitroStudyDetails: "",
  whySpeciesSelected: "",
  whyNumberEssential: "",
  similarExperimentsInEstablishment: "",
  justifyNewExperiment: "",
  similarExperimentsElsewhere: "",
  requirements: [createEmptyRequirement()],
};

function parseSavedStep3(data: Record<string, unknown> | null | undefined): Step3Form {
  if (!data) return EMPTY_FORM;

  const requirementsRaw = data.requirements;
  let requirements: RequirementRow[] = [createEmptyRequirement()];

  if (Array.isArray(requirementsRaw) && requirementsRaw.length > 0) {
    requirements = requirementsRaw.map((entry) => {
      const row = entry as Record<string, unknown>;
      const breakup = Array.isArray(row.year_wise_breakup)
        ? row.year_wise_breakup.map((item) => {
            const yearRow = item as Record<string, unknown>;
            return {
              year: String(yearRow.year ?? ""),
              count: Number(yearRow.count ?? 0),
            };
          })
        : [createEmptyYearRow()];

      return {
        id: crypto.randomUUID(),
        species: String(row.species ?? ""),
        strain: String(row.strain ?? ""),
        sex: String(row.sex ?? ""),
        age: String(row.age ?? ""),
        weight: String(row.weight ?? ""),
        number_required: Number(row.number_required ?? 0),
        source: String(row.source ?? ""),
        justification: String(row.justification ?? ""),
        year_wise_breakup: breakup.length ? breakup : [createEmptyYearRow()],
        days_housed: Number(row.days_housed ?? 0),
        breeder_name: String(row.breeder_name ?? INSTITUTIONAL_DEFAULTS.establishmentName),
        breeder_address: String(row.breeder_address ?? INSTITUTIONAL_DEFAULTS.establishmentAddress),
        breeder_registration_number: String(
          row.breeder_registration_number ?? INSTITUTIONAL_DEFAULTS.registrationNumber,
        ),
      };
    });
  }

  return {
    whyAnimalNecessary: readString(data, "why_animal_necessary"),
    inVitroStudyDetails: readString(data, "in_vitro_study_details"),
    whySpeciesSelected: readString(data, "why_species_selected"),
    whyNumberEssential: readString(data, "why_number_essential"),
    similarExperimentsInEstablishment: readString(data, "similar_experiments_in_establishment"),
    justifyNewExperiment: readString(data, "justify_new_experiment"),
    similarExperimentsElsewhere: readString(data, "similar_experiments_elsewhere"),
    requirements,
  };
}

function applyStudyPlanTotal(formState: Step3Form, studyPlanTotal: number | null): Step3Form {
  if (studyPlanTotal == null || studyPlanTotal <= 0) {
    return formState;
  }
  if (formState.requirements.length !== 1) {
    return formState;
  }

  const row = formState.requirements[0];
  const yearWiseBreakup =
    row.year_wise_breakup.length === 1
      ? [{ ...row.year_wise_breakup[0], count: studyPlanTotal }]
      : row.year_wise_breakup;

  return {
    ...formState,
    requirements: [{ ...row, number_required: studyPlanTotal, year_wise_breakup: yearWiseBreakup }],
  };
}

export function FormBStep3() {
  const navigate = useNavigate();
  const [formBId] = useState<number | null>(readStoredFormBId());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Step3Form>(EMPTY_FORM);
  const [studyPlanTotal, setStudyPlanTotal] = useState<number | null>(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState(true);
  const [speciesOptions, setSpeciesOptions] = useState<LookupOption[]>([]);
  const [strainCache, setStrainCache] = useState<Record<number, LookupOption[]>>({});

  const { value: saved, loading: loadingSaved } = useFormBStepReview(
    formBId,
    "step3",
    parseSavedStep3,
    EMPTY_FORM,
  );

  useEffect(() => {
    if (!formBId) {
      setStudyPlanLoading(false);
      return;
    }

    getFormBStudyPlan(formBId)
      .then((plan) => setStudyPlanTotal(plan.total_animals))
      .catch(() => setStudyPlanTotal(null))
      .finally(() => setStudyPlanLoading(false));
  }, [formBId]);

  useEffect(() => {
    getSpeciesOptions().then(setSpeciesOptions).catch(() => setSpeciesOptions([]));
  }, []);

  useEffect(() => {
    if (loadingSaved || studyPlanLoading) {
      return;
    }
    const base = saved ?? EMPTY_FORM;
    setForm(applyStudyPlanTotal(base, studyPlanTotal));
  }, [saved, loadingSaved, studyPlanLoading, studyPlanTotal]);

  async function loadStrains(speciesId: number) {
    if (strainCache[speciesId]) return;
    const strains = await getStrainsOptions(speciesId);
    setStrainCache((current) => ({ ...current, [speciesId]: strains }));
  }

  useEffect(() => {
    if (!speciesOptions.length) return;
    for (const row of form.requirements) {
      if (!row.species) continue;
      const speciesId = speciesOptions.find((option) => option.name === row.species)?.id;
      if (speciesId) {
        void loadStrains(speciesId);
      }
    }
  }, [form.requirements, speciesOptions]);

  function speciesIdForName(name: string): number | null {
    return speciesOptions.find((option) => option.name === name)?.id ?? null;
  }

  function updateRationale<K extends keyof Omit<Step3Form, "requirements">>(
    key: K,
    value: Step3Form[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRequirement(id: string, patch: Partial<RequirementRow>) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    }));
  }

  function addRequirement() {
    setForm((current) => ({
      ...current,
      requirements: [...current.requirements, createEmptyRequirement()],
    }));
  }

  function removeRequirement(id: string) {
    setForm((current) => ({
      ...current,
      requirements:
        current.requirements.length === 1
          ? current.requirements
          : current.requirements.filter((row) => row.id !== id),
    }));
  }

  function validateStep3() {
    if (studyPlanTotal == null || studyPlanTotal <= 0) {
      return "Complete Step 2b (study plan) before saving animal requirements.";
    }

    const requirementTotal = form.requirements.reduce(
      (sum, row) => sum + (row.number_required || 0),
      0,
    );
    if (requirementTotal !== studyPlanTotal) {
      return (
        `Total animals across requirement rows (${requirementTotal}) must match the ` +
        `Step 2b study plan total (${studyPlanTotal}).`
      );
    }

    if (!form.whyAnimalNecessary.trim()) return "Explain why animal usage is necessary.";
    if (!form.inVitroStudyDetails.trim()) return "Describe in vitro study status.";
    if (!form.whySpeciesSelected.trim()) return "Explain species selection.";
    if (!form.whyNumberEssential.trim()) return "Justify the number of animals.";
    if (!form.similarExperimentsInEstablishment.trim()) {
      return "State whether similar experiments were conducted in your establishment.";
    }
    if (
      form.similarExperimentsInEstablishment.trim().toLowerCase().startsWith("yes") &&
      !form.justifyNewExperiment.trim()
    ) {
      return "Justify why a new experiment is required when similar work was done in your establishment.";
    }
    if (!form.similarExperimentsElsewhere.trim()) {
      return "Provide references for similar experiments elsewhere.";
    }

    for (let index = 0; index < form.requirements.length; index += 1) {
      const row = form.requirements[index];
      const label = `Requirement ${index + 1}`;
      if (!row.species) return `${label}: species is required.`;
      if (!row.strain) return `${label}: strain is required.`;
      if (!row.sex) return `${label}: sex is required.`;
      if (!row.age) return `${label}: age is required.`;
      if (!row.weight.trim()) return `${label}: weight range is required.`;
      const weightError = validateWeightGrams(row.weight);
      if (weightError) return `${label}: ${weightError}`;
      if (!row.number_required || row.number_required <= 0) {
        return `${label}: number of animals must be greater than zero.`;
      }
      if (!row.source) return `${label}: source is required.`;
      if (!row.justification.trim()) return `${label}: justification is required.`;
      if (!row.days_housed || row.days_housed <= 0) return `${label}: days housed is required.`;
      if (!row.breeder_name.trim()) return `${label}: breeder name is required.`;
      if (!row.breeder_address.trim()) return `${label}: breeder address is required.`;
      if (!row.breeder_registration_number.trim()) {
        return `${label}: breeder registration number is required.`;
      }
      if (!row.year_wise_breakup.length) {
        return `${label}: add at least one year-wise animal count.`;
      }
      for (let yearIndex = 0; yearIndex < row.year_wise_breakup.length; yearIndex += 1) {
        const yearRow = row.year_wise_breakup[yearIndex];
        if (!yearRow.year.trim()) {
          return `${label}: year ${yearIndex + 1} is required in the year-wise breakup.`;
        }
        if (!yearRow.count || yearRow.count <= 0) {
          return `${label}: year ${yearIndex + 1} must have a positive animal count.`;
        }
      }
      const breakupTotal = row.year_wise_breakup.reduce(
        (sum, yearRow) => sum + Number(yearRow.count),
        0,
      );
      if (breakupTotal !== Number(row.number_required)) {
        return `${label}: year-wise counts (${breakupTotal}) must equal the total number required (${row.number_required}).`;
      }
    }

    return null;
  }

  async function handleNext() {
    if (!formBId) {
      alert("Form B ID missing. Please complete previous steps.");
      return;
    }

    const error = validateStep3();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await saveFormBStep3({
        form_b_id: formBId,
        why_animal_necessary: form.whyAnimalNecessary.trim(),
        in_vitro_study_details: form.inVitroStudyDetails.trim(),
        why_species_selected: form.whySpeciesSelected.trim(),
        why_number_essential: form.whyNumberEssential.trim(),
        similar_experiments_in_establishment: form.similarExperimentsInEstablishment.trim(),
        justify_new_experiment: form.justifyNewExperiment.trim(),
        similar_experiments_elsewhere: form.similarExperimentsElsewhere.trim(),
        requirements: form.requirements.map(({ id: _id, ...row }) => ({
          ...row,
          weight: row.weight.trim(),
          justification: row.justification.trim(),
          number_required:
            form.requirements.length === 1 && studyPlanTotal != null && studyPlanTotal > 0
              ? studyPlanTotal
              : Number(row.number_required),
          days_housed: Number(row.days_housed),
        })),
      });

      navigate("/form-b/step-4");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loadingSaved || studyPlanLoading) {
    return <LoadingState label="Loading animal requirements..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Form B – Step 3</h2>
        <p>Section II: Animal requirements and rationale for animal usage.</p>
      </header>

      {!formBId && (
        <p className="error-text">Form B ID not found. Please complete previous steps.</p>
      )}

      {formBId && (
        <>
          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
          {studyPlanTotal != null && studyPlanTotal > 0 ? (
            <div className="summary-card" style={{ marginBottom: "1rem" }}>
              <h4>Total animals (from Step 2b study plan)</h4>
              <p>{studyPlanTotal}</p>
              {form.requirements.length === 1 ? (
                <p className="field-help">
                  The total number required below is filled automatically from your study plan.
                </p>
              ) : (
                <p className="field-help">
                  Split this total across the species/strain rows below. All rows must add up to{" "}
                  {studyPlanTotal}.
                </p>
              )}
            </div>
          ) : (
            <p className="error-text">
              Complete Step 2b (study plan) first so the animal total can be carried forward here.
            </p>
          )}
          <p><strong>Form B internal ID:</strong> {formBId}</p>

          <div className="form-grid">
            <label className="full-width">
              Why is animal usage necessary for these studies?
              <textarea
                value={form.whyAnimalNecessary}
                onChange={(e) => updateRationale("whyAnimalNecessary", e.target.value)}
              />
            </label>
            <label className="full-width">
              Whether similar study has been conducted on in vitro models? If yes, describe.
              <textarea
                value={form.inVitroStudyDetails}
                onChange={(e) => updateRationale("inVitroStudyDetails", e.target.value)}
              />
            </label>
            <label className="full-width">
              Why are the particular species selected?
              <textarea
                value={form.whySpeciesSelected}
                onChange={(e) => updateRationale("whySpeciesSelected", e.target.value)}
              />
            </label>
            <label className="full-width">
              Why is the estimated number of animals essential?
              <textarea
                value={form.whyNumberEssential}
                onChange={(e) => updateRationale("whyNumberEssential", e.target.value)}
              />
            </label>
            <label className="full-width">
              Are similar experiments conducted in the past in your establishment?
              <textarea
                value={form.similarExperimentsInEstablishment}
                onChange={(e) =>
                  updateRationale("similarExperimentsInEstablishment", e.target.value)
                }
              />
            </label>
            <label className="full-width">
              If yes, justify why a new experiment is required.
              <textarea
                value={form.justifyNewExperiment}
                onChange={(e) => updateRationale("justifyNewExperiment", e.target.value)}
              />
            </label>
            <label className="full-width">
              Have similar experiments been conducted by any other organization? Provide references.
              <textarea
                value={form.similarExperimentsElsewhere}
                onChange={(e) => updateRationale("similarExperimentsElsewhere", e.target.value)}
              />
            </label>
          </div>

          <div className="subform-header full-width">
            <h3>Species / strain rows</h3>
            <button type="button" className="btn btn-secondary" onClick={addRequirement}>
              Add species / strain
            </button>
          </div>

          {form.requirements.map((row, index) => (
            <div key={row.id} className="item-row full-width">
              <div className="subform-header full-width">
                <h3>Requirement {index + 1}</h3>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeRequirement(row.id)}
                  disabled={form.requirements.length === 1}
                >
                  Remove
                </button>
              </div>

              <div className="form-grid">
                <label>
                  Species
                  <select
                    value={row.species}
                    onChange={(e) => {
                      const species = e.target.value;
                      const speciesId = speciesIdForName(species);
                      updateRequirement(row.id, { species, strain: "" });
                      if (speciesId) void loadStrains(speciesId);
                    }}
                  >
                    <option value="">Select species</option>
                    {speciesOptions.map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Strain
                  <select
                    value={row.strain}
                    onChange={(e) => updateRequirement(row.id, { strain: e.target.value })}
                    disabled={!row.species}
                  >
                    <option value="">Select strain</option>
                    {(
                      (() => {
                        const speciesId = speciesIdForName(row.species);
                        return speciesId ? strainCache[speciesId] ?? [] : [];
                      })()
                    ).map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sex
                  <select
                    value={row.sex}
                    onChange={(e) => updateRequirement(row.id, { sex: e.target.value })}
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Either">Either</option>
                  </select>
                </label>
                <label>
                  Age
                  <select
                    value={row.age}
                    onChange={(e) => updateRequirement(row.id, { age: e.target.value })}
                  >
                    <option value="">Select age</option>
                    <option value="4–6 weeks">4–6 weeks</option>
                    <option value="6–8 weeks">6–8 weeks</option>
                    <option value="8–10 weeks">8–10 weeks</option>
                    <option value="Adult">Adult</option>
                  </select>
                </label>
                <label>
                  Weight range (grams)
                  <input
                    value={row.weight}
                    placeholder="e.g. 200 g or 200-250 g"
                    onChange={(e) => updateRequirement(row.id, { weight: e.target.value })}
                  />
                </label>
                <label>
                  Total number required
                  {form.requirements.length === 1 && studyPlanTotal != null && studyPlanTotal > 0 ? (
                    <>
                      <input type="number" value={studyPlanTotal} readOnly disabled />
                      <span className="field-help">From Step 2b study plan.</span>
                    </>
                  ) : (
                    <input
                      type="number"
                      value={row.number_required || ""}
                      onChange={(e) =>
                        updateRequirement(row.id, { number_required: Number(e.target.value) })
                      }
                    />
                  )}
                </label>
                <label>
                  Number of days each animal will be housed
                  <input
                    type="number"
                    value={row.days_housed || ""}
                    onChange={(e) =>
                      updateRequirement(row.id, { days_housed: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Source of animals
                  <select
                    value={row.source}
                    onChange={(e) => updateRequirement(row.id, { source: e.target.value })}
                  >
                    <option value="">Select source</option>
                    <option value="Institutional Animal House">Institutional Animal House</option>
                    <option value="CPCSEA Registered Breeder">CPCSEA Registered Breeder</option>
                    <option value="Other IAEC-approved source">Other IAEC-approved source</option>
                  </select>
                </label>
                <label className="full-width">
                  Justification for number of animals
                  <textarea
                    value={row.justification}
                    onChange={(e) => updateRequirement(row.id, { justification: e.target.value })}
                  />
                </label>
                <label>
                  Breeder name
                  <input
                    value={row.breeder_name}
                    onChange={(e) => updateRequirement(row.id, { breeder_name: e.target.value })}
                  />
                </label>
                <label>
                  Breeder registration number
                  <input
                    value={row.breeder_registration_number}
                    onChange={(e) =>
                      updateRequirement(row.id, { breeder_registration_number: e.target.value })
                    }
                  />
                </label>
                <label className="full-width">
                  Breeder address
                  <textarea
                    value={row.breeder_address}
                    onChange={(e) => updateRequirement(row.id, { breeder_address: e.target.value })}
                  />
                </label>
                <label className="full-width">
                  Year-wise breakup (year and count)
                  <div className="form-grid">
                    {row.year_wise_breakup.map((yearRow, yearIndex) => (
                      <div key={`${row.id}-${yearIndex}`} className="full-width form-grid">
                        <label>
                          Year
                          <input
                            value={yearRow.year}
                            onChange={(e) => {
                              const next = [...row.year_wise_breakup];
                              next[yearIndex] = { ...next[yearIndex], year: e.target.value };
                              updateRequirement(row.id, { year_wise_breakup: next });
                            }}
                          />
                        </label>
                        <label>
                          Count
                          <input
                            type="number"
                            value={yearRow.count || ""}
                            onChange={(e) => {
                              const next = [...row.year_wise_breakup];
                              next[yearIndex] = {
                                ...next[yearIndex],
                                count: Number(e.target.value),
                              };
                              updateRequirement(row.id, { year_wise_breakup: next });
                            }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </label>
              </div>
            </div>
          ))}

          <div className="wizard-actions">
            <button className="btn-secondary" onClick={() => navigate("/form-b/step-2b")}>
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
