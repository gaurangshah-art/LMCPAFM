import type { FormBStudyGroupEntry } from "../../../api/formbApi";
import {
  isSpeciesOtherSelect,
  SPECIES_STRAIN_OTHER_LABEL,
  SPECIES_STRAIN_OTHER_SELECT_VALUE,
  studyGroupSpeciesSelectValue,
  studyGroupStrainSelectValue,
  studyGroupUsesOtherSpecies,
} from "../../../utils/speciesStrainFields";
import { FATE_TYPE_OPTIONS } from "../../../constants/formBStudyPlan";
import { formatProjectSpeciesStrainLabel } from "../../../constants/formBProjectSpeciesStrain";
import { GROUP_ROLES, emptyDosing } from "./formBStudyPlanModel";
import { useFormBStudyPlan } from "./FormBStudyPlanContext";

interface FormBStudyPlanGroupEditorProps {
  phaseIndex: number;
  groupIndex: number;
  group: FormBStudyGroupEntry;
}

export function FormBStudyPlanGroupEditor({
  phaseIndex,
  groupIndex,
  group,
}: FormBStudyPlanGroupEditorProps) {
  const {
    projectSpeciesStrain,
    speciesOptions,
    ensureStrainsLoaded,
    strainsForSpecies,
    strainsLoading,
    updateGroup,
    updateFate,
    addFate,
    removeFate,
  } = useFormBStudyPlan();

  const dose = group.dosing[0] ?? emptyDosing();

  return (
    <div className="page-section nested-section">
      <h4>{group.group_name || "Untitled group"} (n={group.animal_count})</h4>
      <div className="form-grid">
        <label>
          Group title
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
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
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
        {projectSpeciesStrain.enabled ? (
          <p className="field-help full-width">
            Species / strain:{" "}
            <strong>
              {formatProjectSpeciesStrainLabel(
                projectSpeciesStrain,
                speciesOptions,
                strainsForSpecies,
              )}
            </strong>{" "}
          · {projectSpeciesStrain.sex}, {projectSpeciesStrain.age},{" "}
          {projectSpeciesStrain.weight_range}, {projectSpeciesStrain.feeding_diet}
        </p>
        ) : (
          <>
            <label>
              Species
              <select
                value={studyGroupSpeciesSelectValue(group)}
                onChange={(e) => {
                  const pick = e.target.value;
                  if (isSpeciesOtherSelect(pick)) {
                    updateGroup(phaseIndex, groupIndex, {
                      species_id: null,
                      strain_id: null,
                      species_other: "",
                      strain_other: "",
                    });
                    return;
                  }
                  const speciesId = pick ? Number(pick) : null;
                  updateGroup(phaseIndex, groupIndex, {
                    species_id: speciesId,
                    strain_id: null,
                    species_other: null,
                    strain_other: null,
                  });
                  if (speciesId) void ensureStrainsLoaded(speciesId);
                }}
              >
                <option value="">Select species</option>
                {speciesOptions.map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.name}
                  </option>
                ))}
                <option value={SPECIES_STRAIN_OTHER_SELECT_VALUE}>{SPECIES_STRAIN_OTHER_LABEL}</option>
              </select>
            </label>
            {studyGroupUsesOtherSpecies(group) ? (
              <label>
                Specify species
                <input
                  value={group.species_other ?? ""}
                  placeholder="Enter species name"
                  onChange={(e) =>
                    updateGroup(phaseIndex, groupIndex, { species_other: e.target.value })
                  }
                />
              </label>
            ) : null}
            {!studyGroupUsesOtherSpecies(group) ? (
              <label>
                Strain
                <select
                  value={studyGroupStrainSelectValue(group)}
                  onChange={(e) => {
                    const pick = e.target.value;
                    if (isSpeciesOtherSelect(pick)) {
                      updateGroup(phaseIndex, groupIndex, { strain_id: null, strain_other: "" });
                      return;
                    }
                    updateGroup(phaseIndex, groupIndex, {
                      strain_id: pick ? Number(pick) : null,
                      strain_other: null,
                    });
                  }}
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
                    <option key={option.id} value={String(option.id)}>
                      {option.name}
                    </option>
                  ))}
                  <option value={SPECIES_STRAIN_OTHER_SELECT_VALUE}>
                    {SPECIES_STRAIN_OTHER_LABEL}
                  </option>
                </select>
              </label>
            ) : null}
            {studyGroupUsesOtherSpecies(group) ||
            studyGroupStrainSelectValue(group) === SPECIES_STRAIN_OTHER_SELECT_VALUE ? (
              <label>
                Specify strain
                <input
                  value={group.strain_other ?? ""}
                  placeholder="Enter strain name"
                  onChange={(e) =>
                    updateGroup(phaseIndex, groupIndex, { strain_other: e.target.value })
                  }
                />
              </label>
            ) : null}
          </>
        )}
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
          How animals in this group will be used, sacrificed, or rehabilitated. Counts must total{" "}
          {group.animal_count}.
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
                      updateFate(phaseIndex, groupIndex, fateIndex, { fate_type: e.target.value })
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
                      updateFate(phaseIndex, groupIndex, fateIndex, { count: Number(e.target.value) })
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
                      updateFate(phaseIndex, groupIndex, fateIndex, { timing: e.target.value })
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
        <button type="button" className="btn-secondary" onClick={() => addFate(phaseIndex, groupIndex)}>
          + Add disposition row
        </button>
      </div>
    </div>
  );
}
