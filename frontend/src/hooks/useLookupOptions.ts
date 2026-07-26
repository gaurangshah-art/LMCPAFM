import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../api/errors";
import type { LookupOption } from "../api/lookupApi";

type Loader = () => Promise<LookupOption[]>;

export function useLookupOptions(loader: Loader) {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
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
  }, [loader]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
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
  }, [loader]);

  return { options, isLoading, error, reload };
}
