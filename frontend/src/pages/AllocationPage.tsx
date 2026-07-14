import { useState } from "react";
import type { AppRole } from "../app/roles";
import { getAllocation } from "../api/requisitionApi";
import { getApiErrorMessage } from "../api/errors";
import type { AnimalAllocation } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { AllocationForm } from "../components/forms/AllocationForm";
import { AllocationTable } from "../components/tables/AllocationTable";

interface AllocationPageProps {
  role: AppRole;
}

export function AllocationPage({ role }: AllocationPageProps) {
  const [allocation, setAllocation] = useState<AnimalAllocation | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLookup() {
    if (!lookupId) {
      setLookupError("Enter an allocation id.");
      return;
    }

    try {
      setIsLoading(true);
      setLookupError(null);
      const data = await getAllocation(Number(lookupId));
      setAllocation(data);
    } catch (error) {
      setLookupError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page-grid">
      {role !== "admin" ? (
        <PageSection title="Allocation Access" subtitle="Admin role required">
          <ErrorAlert message="Allocation actions are available only for Admin role. Switch role to Admin from the top-right selector." />
        </PageSection>
      ) : (
        <>
          <PageSection title="Create Allocation" subtitle="POST /iaec/allocation">
            <AllocationForm onCreated={setAllocation} />
          </PageSection>

          <PageSection title="Allocation Lookup" subtitle="GET /iaec/allocation/{alloc_id}">
            <div className="lookup-row">
              <input
                type="number"
                min={1}
                step={1}
                onWheel={(event) => event.currentTarget.blur()}
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
                placeholder="Allocation ID"
              />
              <button type="button" className="btn" onClick={() => void handleLookup()}>
                Fetch Allocation
              </button>
            </div>
            {isLoading ? <LoadingState label="Fetching allocation..." /> : null}
            {lookupError ? <ErrorAlert message={lookupError} /> : null}
            <AllocationTable allocation={allocation} />
          </PageSection>
        </>
      )}
    </div>
  );
}
