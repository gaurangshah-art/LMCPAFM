import { useCallback, useEffect, useRef, useState } from "react";
import { getStrainsOptions, type LookupOption } from "../api/lookupApi";

function normalizeSpeciesId(speciesId: number | string | null | undefined): number | null {
  if (speciesId == null || speciesId === "") return null;
  const id = Number(speciesId);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function useStrainLookup(speciesIds: Array<number | string | null | undefined>) {
  const [strainCache, setStrainCache] = useState<Record<number, LookupOption[]>>({});
  const inFlightRef = useRef<Set<number>>(new Set());
  const loadedRef = useRef<Set<number>>(new Set());

  const ensureStrainsLoaded = useCallback(async (rawSpeciesId: number | string | null | undefined) => {
    const speciesId = normalizeSpeciesId(rawSpeciesId);
    if (!speciesId || loadedRef.current.has(speciesId) || inFlightRef.current.has(speciesId)) {
      return;
    }

    inFlightRef.current.add(speciesId);
    try {
      const strains = await getStrainsOptions(speciesId);
      loadedRef.current.add(speciesId);
      setStrainCache((current) => ({ ...current, [speciesId]: strains }));
    } catch {
      loadedRef.current.add(speciesId);
      setStrainCache((current) => ({ ...current, [speciesId]: [] }));
    } finally {
      inFlightRef.current.delete(speciesId);
    }
  }, []);

  useEffect(() => {
    const uniqueIds = new Set<number>();
    for (const rawId of speciesIds) {
      const id = normalizeSpeciesId(rawId);
      if (id) uniqueIds.add(id);
    }
    uniqueIds.forEach((id) => {
      void ensureStrainsLoaded(id);
    });
  }, [speciesIds, ensureStrainsLoaded]);

  function strainsForSpecies(rawSpeciesId: number | string | null | undefined): LookupOption[] {
    const speciesId = normalizeSpeciesId(rawSpeciesId);
    if (!speciesId) return [];
    return strainCache[speciesId] ?? [];
  }

  function strainsLoading(rawSpeciesId: number | string | null | undefined): boolean {
    const speciesId = normalizeSpeciesId(rawSpeciesId);
    if (!speciesId) return false;
    return strainCache[speciesId] === undefined;
  }

  return {
    ensureStrainsLoaded,
    strainsForSpecies,
    strainsLoading,
  };
}
