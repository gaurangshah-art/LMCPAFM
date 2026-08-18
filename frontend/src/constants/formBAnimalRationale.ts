import { INSTITUTIONAL_DEFAULTS } from "./institution";

export interface FormBYearWiseCountEntry {
  year: string;
  count: number;
}

export interface FormBAnimalRationaleForm {
  whyAnimalNecessary: string;
  inVitroStudyDetails: string;
  whySpeciesSelected: string;
  whyNumberEssential: string;
  similarExperimentsInEstablishment: string;
  justifyNewExperiment: string;
  similarExperimentsElsewhere: string;
  animalSource: string;
  daysHoused: number;
  numberJustification: string;
  yearWiseBreakup: FormBYearWiseCountEntry[];
  breederName: string;
  breederAddress: string;
  breederRegistrationNumber: string;
}

export function createEmptyAnimalRationale(): FormBAnimalRationaleForm {
  return {
    whyAnimalNecessary: "",
    inVitroStudyDetails: "",
    whySpeciesSelected: "",
    whyNumberEssential: "",
    similarExperimentsInEstablishment: "",
    justifyNewExperiment: "",
    similarExperimentsElsewhere: "",
    animalSource: "",
    daysHoused: 0,
    numberJustification: "",
    yearWiseBreakup: [{ year: "", count: 0 }],
    breederName: INSTITUTIONAL_DEFAULTS.establishmentName,
    breederAddress: INSTITUTIONAL_DEFAULTS.establishmentAddress,
    breederRegistrationNumber: INSTITUTIONAL_DEFAULTS.registrationNumber,
  };
}

export function parseAnimalRationale(saved: Record<string, unknown> | null | undefined): FormBAnimalRationaleForm {
  const empty = createEmptyAnimalRationale();
  if (!saved) return empty;

  const breakupRaw = saved.year_wise_breakup;
  const yearWiseBreakup = Array.isArray(breakupRaw) && breakupRaw.length
    ? breakupRaw.map((entry) => {
        const row = entry as Record<string, unknown>;
        return {
          year: String(row.year ?? ""),
          count: Number(row.count ?? 0),
        };
      })
    : empty.yearWiseBreakup;

  return {
    whyAnimalNecessary: String(saved.why_animal_necessary ?? ""),
    inVitroStudyDetails: String(saved.in_vitro_study_details ?? ""),
    whySpeciesSelected: String(saved.why_species_selected ?? ""),
    whyNumberEssential: String(saved.why_number_essential ?? ""),
    similarExperimentsInEstablishment: String(saved.similar_experiments_in_establishment ?? ""),
    justifyNewExperiment: String(saved.justify_new_experiment ?? ""),
    similarExperimentsElsewhere: String(saved.similar_experiments_elsewhere ?? ""),
    animalSource: String(saved.animal_source ?? ""),
    daysHoused: Number(saved.days_housed ?? 0),
    numberJustification: String(saved.number_justification ?? ""),
    yearWiseBreakup,
    breederName: String(saved.breeder_name ?? empty.breederName),
    breederAddress: String(saved.breeder_address ?? empty.breederAddress),
    breederRegistrationNumber: String(
      saved.breeder_registration_number ?? empty.breederRegistrationNumber,
    ),
  };
}

export function serializeAnimalRationale(form: FormBAnimalRationaleForm) {
  return {
    why_animal_necessary: form.whyAnimalNecessary.trim(),
    in_vitro_study_details: form.inVitroStudyDetails.trim(),
    why_species_selected: form.whySpeciesSelected.trim(),
    why_number_essential: form.whyNumberEssential.trim(),
    similar_experiments_in_establishment: form.similarExperimentsInEstablishment.trim(),
    justify_new_experiment: form.justifyNewExperiment.trim(),
    similar_experiments_elsewhere: form.similarExperimentsElsewhere.trim(),
    animal_source: form.animalSource.trim(),
    days_housed: Number(form.daysHoused),
    number_justification: form.numberJustification.trim(),
    year_wise_breakup: form.yearWiseBreakup.map((row) => ({
      year: row.year.trim(),
      count: Number(row.count),
    })),
    breeder_name: form.breederName.trim(),
    breeder_address: form.breederAddress.trim(),
    breeder_registration_number: form.breederRegistrationNumber.trim(),
  };
}
