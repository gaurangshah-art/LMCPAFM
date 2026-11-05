import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../api/errors";
import type { LookupOption } from "../api/lookupApi";

type Loader = () => Promise<LookupOption[]>;

interface UseLookupOptionsConfig {
  enabled?: boolean;
}

export function useLookupOptions(loader: Loader, config: UseLookupOptionsConfig = {}) {
  const enabled = config.enabled ?? true;
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data = await loader();
      setOptions(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, loader]);

  useEffect(() => {
    if (!enabled) {
      setOptions([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await loader();
        if (!cancelled) {
          setOptions(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, loader]);

  return { options, isLoading, error, reload };
}
