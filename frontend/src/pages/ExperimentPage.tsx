import { useState } from "react";
import { getExperiment } from "../api/experimentApi";
import { getApiErrorMessage } from "../api/errors";
import type { Experiment } from "../api/types";
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
          <input
            type="number"
            value={lookupId}
            onChange={(event) => setLookupId(event.target.value)}
            placeholder="Experiment ID"
          />
          <button className="btn" type="button" onClick={() => void handleLookup()}>
            Fetch Experiment
          </button>
        </div>
        {isLoading ? <LoadingState label="Loading experiment..." /> : null}
        {lookupError ? <ErrorAlert message={lookupError} /> : null}
        <ExperimentTable experiment={experiment} />
      </PageSection>
    </div>
  );
}
