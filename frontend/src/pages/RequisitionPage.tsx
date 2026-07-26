import { useState } from "react";
import { hasAnyRole } from "../app/roles";
import { getApprovedRequisitionOptions } from "../api/lookupApi";
import { getRequisition } from "../api/requisitionApi";
import { getApiErrorMessage } from "../api/errors";
import type { AnimalRequisition, User } from "../api/types";
import { useLookupOptions } from "../hooks/useLookupOptions";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { RequisitionForm } from "../components/forms/RequisitionForm";
import { RequisitionTable } from "../components/tables/RequisitionTable";

interface RequisitionPageProps {
  currentUser: User | null;
}

export function RequisitionPage({ currentUser }: RequisitionPageProps) {
  const [requisition, setRequisition] = useState<AnimalRequisition | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requisitionOptions = useLookupOptions(getApprovedRequisitionOptions);
  const canAccessRequisitions = hasAnyRole(currentUser, ["investigator", "iaec", "staff"]);

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
      {!currentUser ? (
        <PageSection title="Requisition Access" subtitle="Authentication required">
          <ErrorAlert message="Log in with an investigator, IAEC, or staff account to create and view requisitions." />
        </PageSection>
      ) : !canAccessRequisitions ? (
        <PageSection title="Requisition Access" subtitle="Investigator, IAEC, or staff role required">
          <ErrorAlert message="Your account does not have one of the roles required for requisition workflows." />
        </PageSection>
      ) : (
        <>
          <PageSection title="Create Requisition" subtitle="POST /iaec/requisition">
            <RequisitionForm currentUser={currentUser} onCreated={setRequisition} />
          </PageSection>

          <PageSection title="Requisition Lookup" subtitle="GET /iaec/requisition/{req_id}">
            <div className="lookup-row">
              <select
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
              >
                <option value="">
                  {requisitionOptions.isLoading ? "Loading requisitions..." : "Select requisition"}
                </option>
                {requisitionOptions.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <button type="button" className="btn" onClick={() => void handleLookup()}>
                Fetch Requisition
              </button>
            </div>
            {requisitionOptions.error ? <ErrorAlert message={requisitionOptions.error} /> : null}
            {isLoading ? <LoadingState label="Fetching requisition..." /> : null}
            {lookupError ? <ErrorAlert message={lookupError} /> : null}
            <RequisitionTable requisition={requisition} />
          </PageSection>
        </>
      )}
    </div>
  );
}
