import { useState } from "react";
import { hasAnyRole } from "../app/roles";
import { getApprovedAllocationOptions } from "../api/lookupApi";
import { getAllocation } from "../api/requisitionApi";
import { getApiErrorMessage } from "../api/errors";
import type { AnimalAllocation, User } from "../../api/types";
import { useLookupOptions } from "../hooks/useLookupOptions";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { AllocationForm } from "../components/forms/AllocationForm";
import { AllocationTable } from "../components/tables/AllocationTable";

interface AllocationPageProps {
  currentUser: User | null;
}

export function AllocationPage({ currentUser }: AllocationPageProps) {
  const [allocation, setAllocation] = useState<AnimalAllocation | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const allocationOptions = useLookupOptions(getApprovedAllocationOptions);
  const canViewAllocations = hasAnyRole(currentUser, ["investigator", "iaec", "staff"]);
  const canCreateAllocations = hasAnyRole(currentUser, ["iaec", "staff"]);

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
      {!currentUser ? (
        <PageSection title="Allocation Access" subtitle="Authentication required">
          <ErrorAlert message="Log in with an investigator, IAEC, or staff account to access allocation workflows." />
        </PageSection>
      ) : !canViewAllocations ? (
        <PageSection title="Allocation Access" subtitle="Investigator, IAEC, or staff role required">
          <ErrorAlert message="Your account does not have one of the roles required to view allocations." />
        </PageSection>
      ) : (
        <>
          {canCreateAllocations ? (
            <PageSection title="Create Allocation" subtitle="POST /iaec/allocation">
              <AllocationForm onCreated={setAllocation} />
            </PageSection>
          ) : (
            <PageSection title="Create Allocation" subtitle="IAEC or staff role required">
              <ErrorAlert message="Only IAEC and staff users can create allocations. Lookup remains available with your current role." />
            </PageSection>
          )}

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
