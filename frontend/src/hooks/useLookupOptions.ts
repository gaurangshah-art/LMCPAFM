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
    void reload();
  }, [reload]);

  return { options, isLoading, error, reload };
}
