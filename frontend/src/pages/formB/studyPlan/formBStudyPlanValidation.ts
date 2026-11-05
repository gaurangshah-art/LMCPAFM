import type { FormBStudyPhaseEntry } from "../../../api/formbApi";
import type { FormBAnimalRationaleForm } from "../../../constants/formBAnimalRationale";
import type { FormBStudyPlanHazardChoice } from "../../../constants/formBStudyPlanHazard";
import type { FormBProjectSpeciesStrain } from "../../../constants/formBProjectSpeciesStrain";
import { validateStudyGroupSpeciesStrain } from "../../../utils/speciesStrainFields";

export function validateStudyPlanPhases(
  phases: FormBStudyPhaseEntry[],
  projectSpeciesStrain: FormBProjectSpeciesStrain,
): string | null {
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
  }

  if (projectSpeciesStrain.enabled) {
    const projectError = validateStudyGroupSpeciesStrain(
      projectSpeciesStrain,
      "Project species/strain",
    );
    if (projectError) return projectError;
  }

  return null;
}

export function validateStudyPlanGroups(
  phases: FormBStudyPhaseEntry[],
  projectSpeciesStrain: FormBProjectSpeciesStrain,
): string | null {
  for (const phase of phases) {
    for (const group of phase.groups) {
      if (!group.group_name.trim()) return "Every group needs a title.";
      if (group.animal_count <= 0) return `Group "${group.group_name}" needs a positive animal count.`;
      if (!projectSpeciesStrain.enabled) {
        const speciesStrainError = validateStudyGroupSpeciesStrain(
          group,
          `Group "${group.group_name}"`,
        );
        if (speciesStrainError) return speciesStrainError;
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

export function validateStudyPlanComplete(
  phases: FormBStudyPhaseEntry[],
  projectSpeciesStrain: FormBProjectSpeciesStrain,
): string | null {
  return (
    validateStudyPlanPhases(phases, projectSpeciesStrain) ??
    validateStudyPlanGroups(phases, projectSpeciesStrain)
  );
}

export function validateStudyPlanHazardChoice(choice: FormBStudyPlanHazardChoice): string | null {
  if (choice !== "none" && choice !== "yes") {
    return "Indicate whether the study uses radionuclides, infectious agents, recombinant DNA, or other IAEC-regulated hazardous agents.";
  }
  return null;
}

export function validateAnimalRationaleForm(
  animalRationale: FormBAnimalRationaleForm,
  totalAnimals: number,
): string | null {
  if (!animalRationale.whyAnimalNecessary.trim()) {
    return "Explain why animal usage is necessary.";
  }
  if (
    !animalRationale.inVitroStudyDetails.trim() &&
    !animalRationale.whyAnimalNecessary.trim()
  ) {
    return "Describe why animals are needed and any in vitro / alternative work.";
  }
  if (!animalRationale.whySpeciesSelected.trim()) {
    return "Explain species selection.";
  }
  const numberJustification =
    animalRationale.whyNumberEssential.trim() || animalRationale.numberJustification.trim();
  if (!numberJustification) {
    return "Justify the number of animals (design and statistics).";
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
