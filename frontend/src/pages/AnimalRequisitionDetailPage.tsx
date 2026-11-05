import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import { cancelRequisition, getRequisition } from "../api/requisitionApi";
import type { AnimalRequisition, User } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageHeader } from "../components/common/PageHeader";
import { PageSection } from "../components/common/PageSection";
import { RequisitionAmendForm } from "../components/forms/RequisitionAmendForm";
import { formatDisplayDate } from "../utils/dateFormat";

interface AnimalRequisitionDetailPageProps {
  currentUser: User | null;
}

export function AnimalRequisitionDetailPage({ currentUser }: AnimalRequisitionDetailPageProps) {
  const { id } = useParams();
  const requisitionId = Number(id);
  const [requisition, setRequisition] = useState<AnimalRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showAmend, setShowAmend] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(requisitionId) || requisitionId <= 0) {
      setError("Invalid requisition id.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await getRequisition(requisitionId);
      setRequisition(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setRequisition(null);
    } finally {
      setLoading(false);
    }
  }, [requisitionId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function handleCancel() {
    if (!requisition?.can_cancel) return;
    const confirmed = window.confirm(
      "Cancel this requisition? You can submit a new one later if animal house has not allocated animals yet.",
    );
    if (!confirmed) return;

    setCancelling(true);
    setActionError(null);
    try {
      const updated = await cancelRequisition(requisition.id);
      setRequisition(updated);
      setShowAmend(false);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <LoadingState label="Loading requisition..." />;
  if (error) {
    return (
      <div className="page-grid">
        <ErrorAlert message={error} />
        <Link to="/requisitions" className="btn btn-secondary">
          Back to requisitions
        </Link>
      </div>
    );
  }
  if (!requisition) return <ErrorAlert message="Requisition not found." />;

  const statusLabel =
    requisition.status === "cancelled"
      ? "Cancelled"
      : requisition.has_allocation
        ? "Allocated (locked)"
        : "Active — awaiting allocation";

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Animal requisition"
        title={`Requisition #${requisition.id}`}
        subtitle={`Protocol ${requisition.protocol_id} · ${statusLabel}`}
        actions={
          <Link to="/requisitions" className="btn btn-secondary">
            All requisitions
          </Link>
        }
      />

      {actionError ? <ErrorAlert message={actionError} /> : null}

      <PageSection title="Details">
        <div className="detail-grid">
          <div>
            <strong>Requester:</strong> {requisition.requester_name}
          </div>
          <div>
            <strong>Date:</strong> {formatDisplayDate(requisition.date)}
          </div>
          <div>
            <strong>Purpose:</strong> {requisition.purpose}
          </div>
          <div>
            <strong>Status:</strong> {requisition.status ?? "active"}
          </div>
          {requisition.amended_at ? (
            <div>
              <strong>Last amended:</strong> {formatDisplayDate(requisition.amended_at)}
            </div>
          ) : null}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Species ID</th>
                <th>Strain ID</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              {requisition.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.species_id}</td>
                  <td>{item.strain_id}</td>
                  <td>{item.requested_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {requisition.can_amend ? (
          <div className="wizard-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setShowAmend((open) => !open)}
            >
              {showAmend ? "Close amend form" : "Amend requisition"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={cancelling}
              onClick={() => void handleCancel()}
            >
              {cancelling ? "Cancelling…" : "Cancel requisition"}
            </button>
          </div>
        ) : (
          <p className="field-help">
            {requisition.status === "cancelled"
              ? "This requisition was cancelled."
              : requisition.has_allocation
                ? "Animal house has recorded an allocation; contact staff if you need a correction."
                : "Only the principal investigator can amend or cancel before allocation."}
          </p>
        )}
      </PageSection>

      {showAmend && requisition.can_amend && currentUser ? (
        <PageSection title="Amend requisition" subtitle="Update counts or purpose before staff allocate">
          <RequisitionAmendForm
            requisition={requisition}
            onSaved={(updated) => {
              setRequisition(updated);
              setShowAmend(false);
            }}
            onCancel={() => setShowAmend(false)}
          />
        </PageSection>
      ) : null}
    </div>
  );
}
