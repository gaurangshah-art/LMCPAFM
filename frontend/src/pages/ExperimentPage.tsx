import { useState } from "react";
import { getApprovedExperimentOptions } from "../api/lookupApi";
import { getExperiment } from "../api/experimentApi";
import { getApiErrorMessage } from "../api/errors";
import type { Experiment } from "../api/types";
import { useLookupOptions } from "../hooks/useLookupOptions";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { ExperimentForm } from "../components/forms/ExperimentForm";
import { ExperimentTable } from "../components/tables/ExperimentTable";

export function ExperimentPage() {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const approvedExperiments = useLookupOptions(getApprovedExperimentOptions);

  async function handleLookup() {
    if (!lookupId) {
      setLookupError("Enter experiment id.");
      return;
    }

    try {
      setIsLoading(true);
      setLookupError(null);
      const data = await getExperiment(Number(lookupId));
      setExperiment(data);
    } catch (error) {
      setLookupError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page-grid">
      <PageSection title="Create Experiment" subtitle="POST /experiment/">
        <ExperimentForm onCreated={setExperiment} />
      </PageSection>

      <PageSection title="Experiment Lookup" subtitle="GET /experiment/{exp_id}">
        <div className="lookup-row">
          <select
            value={lookupId}
            onChange={(event) => setLookupId(event.target.value)}
          >
            <option value="">
              {approvedExperiments.isLoading ? "Loading experiments..." : "Select experiment"}
            </option>
            {approvedExperiments.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <button className="btn" type="button" onClick={() => void handleLookup()}>
            Fetch Experiment
          </button>
        </div>
        {approvedExperiments.error ? <ErrorAlert message={approvedExperiments.error} /> : null}
        {isLoading ? <LoadingState label="Loading experiment..." /> : null}
        {lookupError ? <ErrorAlert message={lookupError} /> : null}
        <ExperimentTable experiment={experiment} />
      </PageSection>
    </div>
  );
}
