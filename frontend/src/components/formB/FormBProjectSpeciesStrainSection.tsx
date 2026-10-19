import type { LookupOption } from "../../api/lookupApi";
import type { FormBProjectSpeciesStrain } from "../../constants/formBProjectSpeciesStrain";
import {
  isSpeciesOtherSelect,
  SPECIES_STRAIN_OTHER_LABEL,
  SPECIES_STRAIN_OTHER_SELECT_VALUE,
  studyGroupSpeciesSelectValue,
  studyGroupStrainSelectValue,
  studyGroupUsesOtherSpecies,
  validateStudyGroupSpeciesStrain,
} from "../../utils/speciesStrainFields";

interface FormBProjectSpeciesStrainSectionProps {
  value: FormBProjectSpeciesStrain;
  speciesOptions: LookupOption[];
  ensureStrainsLoaded: (speciesId: number) => void;
  strainsForSpecies: (speciesId: number | null | undefined) => LookupOption[];
  strainsLoading: (speciesId: number | null | undefined) => boolean;
  onChange: (next: FormBProjectSpeciesStrain) => void;
}

export function FormBProjectSpeciesStrainSection({
  value,
  speciesOptions,
  ensureStrainsLoaded,
  strainsForSpecies,
  strainsLoading,
  onChange,
}: FormBProjectSpeciesStrainSectionProps) {
  const asGroup = {
    species_id: value.species_id,
    strain_id: value.strain_id,
    species_other: value.species_other,
    strain_other: value.strain_other,
  };

  const validationError = value.enabled
    ? validateStudyGroupSpeciesStrain(asGroup, "Project species/strain")
    : null;

  return (
    <section className="page-section nested-section">
      <label className="checkbox-label full-width">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        This project uses <strong>one species and strain</strong> for all groups (typical for
        single-model studies)
      </label>
      <p className="field-help">
        When checked, you set species/strain once here; every phase and group inherits it. Uncheck
        only if you need different models (e.g. rat and mouse) in the same Form B.
      </p>

      {value.enabled ? (
        <div className="form-grid" style={{ marginTop: "0.75rem" }}>
          <label>
            Species
            <select
              value={studyGroupSpeciesSelectValue(asGroup)}
              onChange={(e) => {
                const pick = e.target.value;
                if (isSpeciesOtherSelect(pick)) {
                  onChange({
                    ...value,
                    species_id: null,
                    strain_id: null,
                    species_other: "",
                    strain_other: "",
                  });
                  return;
                }
                const speciesId = pick ? Number(pick) : null;
                onChange({
                  ...value,
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

          {studyGroupUsesOtherSpecies(asGroup) ? (
            <label>
              Specify species
              <input
                value={value.species_other ?? ""}
                placeholder="Enter species name"
                onChange={(e) => onChange({ ...value, species_other: e.target.value })}
              />
            </label>
          ) : null}

          {!studyGroupUsesOtherSpecies(asGroup) ? (
            <label>
              Strain
              <select
                value={studyGroupStrainSelectValue(asGroup)}
                onChange={(e) => {
                  const pick = e.target.value;
                  if (isSpeciesOtherSelect(pick)) {
                    onChange({ ...value, strain_id: null, strain_other: "" });
                    return;
                  }
                  onChange({
                    ...value,
                    strain_id: pick ? Number(pick) : null,
                    strain_other: null,
                  });
                }}
                disabled={!value.species_id}
              >
                <option value="">
                  {!value.species_id
                    ? "Select species first"
                    : strainsLoading(value.species_id)
                      ? "Loading strains..."
                      : strainsForSpecies(value.species_id).length
                        ? "Select strain"
                        : "No strains for this species"}
                </option>
                {strainsForSpecies(value.species_id).map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.name}
                  </option>
                ))}
                <option value={SPECIES_STRAIN_OTHER_SELECT_VALUE}>{SPECIES_STRAIN_OTHER_LABEL}</option>
              </select>
            </label>
          ) : null}

          {studyGroupUsesOtherSpecies(asGroup) ||
          studyGroupStrainSelectValue(asGroup) === SPECIES_STRAIN_OTHER_SELECT_VALUE ? (
            <label>
              Specify strain
              <input
                value={value.strain_other ?? ""}
                placeholder="Enter strain name"
                onChange={(e) => onChange({ ...value, strain_other: e.target.value })}
              />
            </label>
          ) : null}

          {validationError ? <p className="error-text full-width">{validationError}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
