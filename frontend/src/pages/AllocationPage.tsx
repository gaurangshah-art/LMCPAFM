import { useState } from "react";
import type { AppRole } from "../app/roles";
import { getApprovedAllocationOptions } from "../api/lookupApi";
import { getAllocation } from "../api/requisitionApi";
import { getApiErrorMessage } from "../api/errors";
import type { AnimalAllocation } from "../api/types";
import { useLookupOptions } from "../hooks/useLookupOptions";
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
  const allocationOptions = useLookupOptions(getApprovedAllocationOptions);

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
              <select
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
              >
                <option value="">
                  {allocationOptions.isLoading ? "Loading allocations..." : "Select allocation"}
                </option>
                {allocationOptions.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <button type="button" className="btn" onClick={() => void handleLookup()}>
                Fetch Allocation
              </button>
            </div>
            {allocationOptions.error ? <ErrorAlert message={allocationOptions.error} /> : null}
            {isLoading ? <LoadingState label="Fetching allocation..." /> : null}
            {lookupError ? <ErrorAlert message={lookupError} /> : null}
            <AllocationTable allocation={allocation} />
          </PageSection>
        </>
      )}
    </div>
  );
}
