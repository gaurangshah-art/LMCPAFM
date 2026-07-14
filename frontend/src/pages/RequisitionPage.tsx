import { useState } from "react";
import { getRequisition } from "../api/requisitionApi";
import { getApiErrorMessage } from "../api/errors";
import type { AnimalRequisition } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { RequisitionForm } from "../components/forms/RequisitionForm";
import { RequisitionTable } from "../components/tables/RequisitionTable";

export function RequisitionPage() {
  const [requisition, setRequisition] = useState<AnimalRequisition | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLookup() {
    if (!lookupId) {
      setLookupError("Enter a requisition id.");
      return;
    }

    try {
      setIsLoading(true);
      setLookupError(null);
      const data = await getRequisition(Number(lookupId));
      setRequisition(data);
    } catch (error) {
      setLookupError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page-grid">
      <PageSection title="Create Requisition" subtitle="POST /iaec/requisition">
        <RequisitionForm onCreated={setRequisition} />
      </PageSection>

      <PageSection title="Requisition Lookup" subtitle="GET /iaec/requisition/{req_id}">
        <div className="lookup-row">
          <input
            type="number"
            value={lookupId}
            onChange={(event) => setLookupId(event.target.value)}
            placeholder="Requisition ID"
          />
          <button type="button" className="btn" onClick={() => void handleLookup()}>
            Fetch Requisition
          </button>
        </div>
        {isLoading ? <LoadingState label="Fetching requisition..." /> : null}
        {lookupError ? <ErrorAlert message={lookupError} /> : null}
        <RequisitionTable requisition={requisition} />
      </PageSection>
    </div>
  );
}
