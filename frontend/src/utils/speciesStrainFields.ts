import type { LookupOption } from "../api/lookupApi";
import {
  SPECIES_STRAIN_OTHER_LABEL,
  SPECIES_STRAIN_OTHER_SELECT_VALUE,
} from "../constants/speciesStrain";

export function speciesSelectValue(
  speciesName: string,
  options: LookupOption[],
): string {
  if (!speciesName) return "";
  if (options.some((option) => option.name === speciesName)) {
    return speciesName;
  }
  return SPECIES_STRAIN_OTHER_SELECT_VALUE;
}

export function strainSelectValue(
  strainName: string,
  speciesId: number | null,
  options: LookupOption[],
): string {
  if (!strainName) return "";
  if (!speciesId) return SPECIES_STRAIN_OTHER_SELECT_VALUE;
  if (options.some((option) => option.name === strainName)) {
    return strainName;
  }
  return SPECIES_STRAIN_OTHER_SELECT_VALUE;
}

export function isSpeciesOtherSelect(value: string): boolean {
  return value === SPECIES_STRAIN_OTHER_SELECT_VALUE;
}

export function isSpeciesOtherName(name: string, options: LookupOption[]): boolean {
  return Boolean(name) && !options.some((option) => option.name === name);
}

export interface SpeciesStrainOtherGroup {
  species_id?: number | null;
  strain_id?: number | null;
  species_other?: string | null;
  strain_other?: string | null;
}

export function studyGroupSpeciesSelectValue(group: SpeciesStrainOtherGroup): string {
  if (group.species_id != null && group.species_id > 0) {
    return String(group.species_id);
  }
  if (group.species_other != null) {
    return SPECIES_STRAIN_OTHER_SELECT_VALUE;
  }
  return "";
}

export function studyGroupStrainSelectValue(group: SpeciesStrainOtherGroup): string {
  if (group.strain_id != null && group.strain_id > 0) {
    return String(group.strain_id);
  }
  if (group.strain_other != null) {
    return SPECIES_STRAIN_OTHER_SELECT_VALUE;
  }
  return "";
}

export function studyGroupUsesOtherSpecies(group: SpeciesStrainOtherGroup): boolean {
  return studyGroupSpeciesSelectValue(group) === SPECIES_STRAIN_OTHER_SELECT_VALUE;
}

export function validateStudyGroupSpeciesStrain(
  group: SpeciesStrainOtherGroup,
  groupLabel: string,
): string | null {
  const speciesOther = (group.species_other ?? "").trim();
  const strainOther = (group.strain_other ?? "").trim();
  if (studyGroupUsesOtherSpecies(group)) {
    if (!speciesOther) return `${groupLabel}: specify the species name when Other is selected.`;
    if (!strainOther) return `${groupLabel}: specify the strain name when Other is selected.`;
    return null;
  }
  if (!group.species_id) return `${groupLabel}: species is required.`;
  if (studyGroupStrainSelectValue(group) === SPECIES_STRAIN_OTHER_SELECT_VALUE) {
    if (!strainOther) return `${groupLabel}: specify the strain name when Other is selected.`;
    return null;
  }
  if (!group.strain_id) return `${groupLabel}: strain is required.`;
  return null;
}

export { SPECIES_STRAIN_OTHER_LABEL, SPECIES_STRAIN_OTHER_SELECT_VALUE };
