import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  getFormBStudyPlan,
  previewStudyPlanAnnexurePdf,
  saveFormBStudyPlan,
  type FormBGroupEndpointEntry,
  type FormBGroupFateEntry,
  type FormBStudyGroupEntry,
  type FormBStudyPhaseEntry,
} from "../../../api/formbApi";
import { getApiErrorMessage } from "../../../api/errors";
import { getSpeciesOptions, type LookupOption } from "../../../api/lookupApi";
import {
  createEmptyAnimalRationale,
  parseAnimalRationale,
  serializeAnimalRationale,
  type FormBAnimalRationaleForm,
} from "../../../constants/formBAnimalRationale";
import {
  applyProjectSpeciesStrainToGroup,
  applyProjectSpeciesStrainToPhases,
  createDefaultProjectSpeciesStrain,
  detectUniformDemographics,
  detectUniformProjectSpeciesStrain,
  parseProjectSpeciesStrain,
  serializeProjectSpeciesStrain,
  type FormBProjectSpeciesStrain,
} from "../../../constants/formBProjectSpeciesStrain";
import {
  buildStudyPlanPayloadPhases,
  computeAnimalSummary,
  countStudyPlanStats,
  defaultEndpoints,
  defaultFate,
  emptyEndpoint,
} from "../../../constants/formBStudyPlan";
import {
  parseStudyPlanHazardProfile,
  serializeStudyPlanHazardProfile,
  type FormBStudyPlanHazardChoice,
} from "../../../constants/formBStudyPlanHazard";
import { DraftRestoreBanner } from "../../../components/common/DraftRestoreBanner";
import { LoadingState } from "../../../components/common/LoadingState";
import { useFormDraftPersistence } from "../../../hooks/useFormDraftPersistence";
import { useFormBEditRouteGuard } from "../../../hooks/useFormBEditRouteGuard";
import { useResolvedFormBId } from "../../../hooks/useResolvedFormBId";
import { useStrainLookup } from "../../../hooks/useStrainLookup";
import { useWizardValidation } from "../../../hooks/useWizardValidation";
import {
  emptyGroup,
  emptyPhase,
  normalizeStudyPlanPhases,
  syncPhaseCap,
} from "./formBStudyPlanModel";
import {
  validateAnimalRationaleForm,
  validateStudyPlanComplete,
  validateStudyPlanGroups,
  validateStudyPlanHazardChoice,
  validateStudyPlanPhases,
} from "./formBStudyPlanValidation";

export function studyPlanStepUrl(
  segment: "plan" | "groups" | "rationale",
  formBId: number | null,
): string {
  const path =
    segment === "plan"
      ? "/form-b/step-2b"
      : segment === "groups"
        ? "/form-b/step-2b/groups"
        : "/form-b/step-2b/rationale";
  return formBId ? `${path}?formBId=${formBId}` : path;
}

type Step2bDraft = {
  designRationale: string;
  animalRationale: FormBAnimalRationaleForm;
  phases: FormBStudyPhaseEntry[];
  specialHazards: FormBStudyPlanHazardChoice;
};

type FormBStudyPlanContextValue = {
  formBId: number | null;
  submitted: boolean;
  loading: boolean;
  loadingSaved: boolean;
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  validationRef: RefObject<HTMLDivElement>;
  validationError: string | null;
  showValidationError: (message: string) => void;
  clearValidationError: () => void;
  designRationale: string;
  setDesignRationale: (value: string) => void;
  animalRationale: FormBAnimalRationaleForm;
  updateAnimalRationale: (patch: Partial<FormBAnimalRationaleForm>) => void;
  specialHazards: FormBStudyPlanHazardChoice;
  setSpecialHazards: (choice: FormBStudyPlanHazardChoice) => void;
  phases: FormBStudyPhaseEntry[];
  projectSpeciesStrain: FormBProjectSpeciesStrain;
  handleProjectSpeciesStrainChange: (next: FormBProjectSpeciesStrain) => void;
  speciesOptions: LookupOption[];
  ensureStrainsLoaded: (speciesId: number) => Promise<void>;
  strainsForSpecies: (speciesId: number | null | undefined) => LookupOption[];
  strainsLoading: (speciesId: number | null | undefined) => boolean;
  totalAnimals: number;
  animalSummary: ReturnType<typeof computeAnimalSummary>;
  updatePhase: (index: number, patch: Partial<FormBStudyPhaseEntry>) => void;
  addPhase: () => void;
  updateGroup: (
    phaseIndex: number,
    groupIndex: number,
    patch: Partial<FormBStudyGroupEntry>,
  ) => void;
  addGroup: (phaseIndex: number) => void;
  updateEndpoint: (
    phaseIndex: number,
    endpointIndex: number,
    patch: Partial<FormBGroupEndpointEntry>,
  ) => void;
  addEndpoint: (phaseIndex: number) => void;
  removeEndpoint: (phaseIndex: number, endpointIndex: number) => void;
  updateFate: (
    phaseIndex: number,
    groupIndex: number,
    fateIndex: number,
    patch: Partial<FormBGroupFateEntry>,
  ) => void;
  addFate: (phaseIndex: number, groupIndex: number) => void;
  removeFate: (phaseIndex: number, groupIndex: number, fateIndex: number) => void;
  validatePhases: () => string | null;
  validateGroups: () => string | null;
  validateComplete: () => string | null;
  validateAnimalRationale: () => string | null;
  validateHazardChoice: () => string | null;
  saveToServer: (nextPath?: string) => Promise<boolean>;
  trySaveProgress: (options?: {
    requireRationale?: boolean;
  }) => Promise<{ saved: boolean; message?: string }>;
  previewAnnexurePdf: () => Promise<void>;
};

const FormBStudyPlanContext = createContext<FormBStudyPlanContextValue | null>(null);

export function useFormBStudyPlan(): FormBStudyPlanContextValue {
  const ctx = useContext(FormBStudyPlanContext);
  if (!ctx) {
    throw new Error("useFormBStudyPlan must be used within FormBStudyPlanProvider");
  }
  return ctx;
}

function FormBStudyPlanProviderInner({ children }: { children: ReactNode }) {
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
  const [specialHazards, setSpecialHazards] = useState<FormBStudyPlanHazardChoice>("");
  const [phases, setPhases] = useState<FormBStudyPhaseEntry[]>([emptyPhase(1)]);
  const [projectSpeciesStrain, setProjectSpeciesStrain] = useState<FormBProjectSpeciesStrain>(
    createDefaultProjectSpeciesStrain(),
  );
  const [speciesOptions, setSpeciesOptions] = useState<LookupOption[]>([]);

  const speciesIdsInPlan = useMemo(() => {
    const fromGroups = phases.flatMap((phase) => phase.groups.map((group) => group.species_id));
    if (projectSpeciesStrain.enabled && projectSpeciesStrain.species_id) {
      return [projectSpeciesStrain.species_id, ...fromGroups];
    }
    return fromGroups;
  }, [phases, projectSpeciesStrain]);
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
          const normalized = normalizeStudyPlanPhases(saved.phases as FormBStudyPhaseEntry[]);
          setDesignRationale(saved.design_rationale ?? "");
          setPhases(normalized);
          setAnimalRationale(parseAnimalRationale(saved.animal_rationale ?? undefined));
          setSpecialHazards(parseStudyPlanHazardProfile(saved.hazard_profile));
          const demo = detectUniformDemographics(normalized);
          if (saved.project_species_strain) {
            setProjectSpeciesStrain({
              ...parseProjectSpeciesStrain(saved.project_species_strain),
              ...(demo ?? {}),
            });
          } else {
            const uniform = detectUniformProjectSpeciesStrain(normalized);
            setProjectSpeciesStrain({
              ...createDefaultProjectSpeciesStrain(),
              ...(uniform ?? {}),
              ...(demo ?? {}),
            });
          }
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
    () => ({ designRationale, animalRationale, phases, specialHazards }),
    [designRationale, animalRationale, phases, specialHazards],
  );

  const shouldOfferStep2bRestore = useCallback((saved: Step2bDraft, current: Step2bDraft) => {
    const savedStats = countStudyPlanStats(saved.phases);
    const currentStats = countStudyPlanStats(current.phases);
    if (
      savedStats.groups !== currentStats.groups ||
      savedStats.animals !== currentStats.animals ||
      savedStats.phases !== currentStats.phases
    ) {
      return true;
    }
    return JSON.stringify(saved) !== JSON.stringify(current);
  }, []);

  const { restoreOffer, acceptRestore, dismissRestore, clearDraft } = useFormDraftPersistence({
    formBId,
    stepKey: "step2b",
    draft: step2bDraft,
    hydrated: !loadingSaved,
    shouldOfferRestore: shouldOfferStep2bRestore,
    applyDraft: (saved) => {
      setDesignRationale(saved.designRationale);
      setAnimalRationale(saved.animalRationale);
      setPhases(saved.phases);
      setSpecialHazards(saved.specialHazards ?? "");
    },
  });

  const restoreBannerDetail = useMemo(() => {
    if (!restoreOffer) {
      return undefined;
    }
    const saved = countStudyPlanStats(restoreOffer.phases);
    const onServer = countStudyPlanStats(phases);
    return `Local draft: ${saved.groups} group(s), ${saved.animals} animal(s). Last saved on server: ${onServer.groups} group(s), ${onServer.animals} animal(s). Restore to recover work that was not saved to the server.`;
  }, [restoreOffer, phases]);

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
    setPhases((current) =>
      applyProjectSpeciesStrainToPhases(
        [...current, emptyPhase(current.length + 1)],
        projectSpeciesStrain,
      ),
    );
  }

  function addGroup(phaseIndex: number) {
    setPhases((current) =>
      current.map((phase, pi) => {
        if (pi !== phaseIndex) return phase;
        const nextIndex = phase.groups.length + 1;
        const newGroup = applyProjectSpeciesStrainToGroup(
          {
            ...emptyGroup(6),
            group_code: `G${nextIndex}`,
            group_name: `Group ${nextIndex}`,
          },
          projectSpeciesStrain,
        );
        const groups = [...phase.groups, newGroup];
        return syncPhaseCap({ ...phase, groups });
      }),
    );
  }

  function handleProjectSpeciesStrainChange(next: FormBProjectSpeciesStrain) {
    setProjectSpeciesStrain(next);
    if (next.enabled) {
      setPhases((current) => applyProjectSpeciesStrainToPhases(current, next));
    }
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

  const validatePhases = useCallback(
    () => validateStudyPlanPhases(phases, projectSpeciesStrain),
    [phases, projectSpeciesStrain],
  );

  const validateGroups = useCallback(
    () => validateStudyPlanGroups(phases, projectSpeciesStrain),
    [phases, projectSpeciesStrain],
  );

  const validateComplete = useCallback(
    () => validateStudyPlanComplete(phases, projectSpeciesStrain),
    [phases, projectSpeciesStrain],
  );

  const validateAnimalRationale = useCallback(
    () => validateAnimalRationaleForm(animalRationale, totalAnimals),
    [animalRationale, totalAnimals],
  );

  const validateHazardChoice = useCallback(
    () => validateStudyPlanHazardChoice(specialHazards),
    [specialHazards],
  );

  async function persistStudyPlan(): Promise<void> {
    if (!formBId) {
      throw new Error("Form B ID missing.");
    }
    const syncedPhases = applyProjectSpeciesStrainToPhases(phases, projectSpeciesStrain);
    const payloadPhases = buildStudyPlanPayloadPhases(syncedPhases, syncPhaseCap);
    await saveFormBStudyPlan({
      form_b_id: formBId,
      design_rationale: designRationale.trim() || "Preclinical study plan",
      phases: payloadPhases,
      animal_rationale: serializeAnimalRationale(animalRationale),
      project_species_strain: serializeProjectSpeciesStrain(projectSpeciesStrain),
      hazard_profile: serializeStudyPlanHazardProfile(specialHazards),
    });
    clearDraft();
  }

  async function saveToServer(nextPath?: string): Promise<boolean> {
    if (!formBId) {
      showValidationError("Form B ID missing.");
      return false;
    }
    const planError = validateComplete();
    if (planError) {
      showValidationError(planError);
      return false;
    }
    const hazardError = validateHazardChoice();
    if (hazardError) {
      showValidationError(hazardError);
      return false;
    }
    const rationaleError = validateAnimalRationale();
    if (rationaleError) {
      showValidationError(rationaleError);
      return false;
    }
    clearValidationError();
    setLoading(true);
    setErrorMessage(null);
    try {
      await persistStudyPlan();
      if (nextPath) navigate(nextPath);
      return true;
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      showValidationError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function trySaveProgress(options?: {
    requireRationale?: boolean;
  }): Promise<{ saved: boolean; message?: string }> {
    if (!formBId) {
      return { saved: false, message: "Form B ID missing." };
    }
    const planError = validateComplete();
    if (planError) {
      return {
        saved: false,
        message: `${planError} Your edits are kept in this browser until you can save.`,
      };
    }
    if (options?.requireRationale !== false) {
      const hazardError = validateHazardChoice();
      if (hazardError) {
        return {
          saved: false,
          message: `${hazardError} Your edits are kept in this browser until you can save.`,
        };
      }
      const rationaleError = validateAnimalRationale();
      if (rationaleError) {
        return {
          saved: false,
          message: `${rationaleError} Your edits are kept in this browser until you can save.`,
        };
      }
    }
    try {
      await persistStudyPlan();
      return { saved: true };
    } catch (error) {
      return { saved: false, message: getApiErrorMessage(error) };
    }
  }

  async function previewAnnexurePdf(): Promise<void> {
    if (!formBId) return;
    const planError = validateComplete();
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
      await persistStudyPlan();
      await previewStudyPlanAnnexurePdf(formBId);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const value: FormBStudyPlanContextValue = {
    formBId,
    submitted,
    loading,
    loadingSaved,
    errorMessage,
    setErrorMessage,
    validationRef,
    validationError,
    showValidationError,
    clearValidationError,
    designRationale,
    setDesignRationale,
    animalRationale,
    updateAnimalRationale,
    specialHazards,
    setSpecialHazards,
    phases,
    projectSpeciesStrain,
    handleProjectSpeciesStrainChange,
    speciesOptions,
    ensureStrainsLoaded,
    strainsForSpecies: (speciesId) => strainsForSpecies(speciesId ?? null),
    strainsLoading: (speciesId) => strainsLoading(speciesId ?? null),
    totalAnimals,
    animalSummary,
    updatePhase,
    addPhase,
    updateGroup,
    addGroup,
    updateEndpoint,
    addEndpoint,
    removeEndpoint,
    updateFate,
    addFate,
    removeFate,
    validatePhases,
    validateGroups,
    validateComplete,
    validateAnimalRationale,
    validateHazardChoice,
    saveToServer,
    trySaveProgress,
    previewAnnexurePdf,
  };

  if (loadingSaved || resolvingFormB) {
    return <LoadingState label="Loading study plan..." />;
  }

  return (
    <FormBStudyPlanContext.Provider value={value}>
      {restoreOffer ? (
        <div className="page-card" style={{ marginBottom: "0.5rem" }}>
          <DraftRestoreBanner
            detail={restoreBannerDetail}
            onRestore={acceptRestore}
            onDismiss={dismissRestore}
          />
        </div>
      ) : null}
      {children}
    </FormBStudyPlanContext.Provider>
  );
}

export function FormBStudyPlanProvider() {
  return (
    <FormBStudyPlanProviderInner>
      <Outlet />
    </FormBStudyPlanProviderInner>
  );
}
