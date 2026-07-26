import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getAllocation,
 
  
  updateAllocationComment,
  confirmAllocation,
  adjustAllocation,
} from "../api/allocationApi";

import type {
  Allocation,
  Requisition,
  AnimalExperiment,
} from "../api/types";

import { PageSection } from "../components/common/PageSection";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { DataTable } from "../components/tables/DataTable";

export function AllocationViewPage() {
  const { id } = useParams();
  const allocationId = Number(id);
  const navigate = useNavigate();

  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [experiments, setExperiments] = useState<AnimalExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [adjustQty, setAdjustQty] = useState("");

  async function loadAll() {
    try {
      setLoading(true);

      const alloc = await getAllocation(allocationId);
      setAllocation(alloc);

      

    } catch {
      setError("Failed to load allocation.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [allocationId]);

  async function handleAddComment() {
    if (!commentText.trim()) return;

    try {
      const updated = await updateAllocationComment(allocationId, commentText);
      setAllocation(updated);
      setCommentText("");
    } catch {
      alert("Failed to add comment.");
    }
  }

  async function handleConfirm() {
    try {
      const updated = await confirmAllocation(allocationId);
      setAllocation(updated);
      alert("Allocation confirmed.");
    } catch {
      alert("Failed to confirm allocation.");
    }
  }

  async function handleAdjust() {
    const qty = Number(adjustQty);
    if (!qty || qty <= 0) {
      alert("Enter a valid quantity.");
      return;
    }

    try {
      const updated = await adjustAllocation(allocationId, qty);
      setAllocation(updated);
      setAdjustQty("");
      alert("Allocation adjusted.");
    } catch {
      alert("Failed to adjust allocation.");
    }
  }

  if (loading) return <LoadingState label="Loading allocation..." />;
  if (error) return <ErrorAlert message={error} />;
  if (!allocation) return <ErrorAlert message="Allocation not found." />;

  return (
    <div className="page-grid">
      {/* ALLOCATION DETAILS */}
      <PageSection
        title={`Allocation #${allocation.id}`}
        subtitle="Full allocation details"
      >
        <div className="detail-grid">
          <div>
            <strong>Requisition ID:</strong> {allocation.requisition_id}
          </div>
          <div>
            <strong>Species:</strong> {allocation.species}
          </div>
          <div>
            <strong>Allocated Quantity:</strong> {allocation.quantity}
          </div>
          <div>
            <strong>Staff:</strong> {allocation.staff_name}
          </div>
          <div>
            <strong>Status:</strong>{" "}
            <span className={`status-tag status-${allocation.status}`}>
              {allocation.status}
            </span>
          </div>
          <div>
            <strong>Date:</strong> {allocation.date}
          </div>
        </div>

        <button className="btn-small" onClick={() => navigate("/allocations")}>
          ← Back to Allocations
        </button>
      </PageSection>

      {/* LINKED REQUISITION */}
      <PageSection
        title="Linked Requisition"
        subtitle="Requisition associated with this allocation"
      >
        {requisition ? (
          <div className="detail-grid">
            <div>
              <strong>Investigator:</strong> {requisition.investigator_name}
            </div>
            <div>
              <strong>Species:</strong> {requisition.species}
            </div>
            <div>
              <strong>Requested Quantity:</strong> {requisition.quantity}
            </div>
            <div>
              <strong>Status:</strong> {requisition.status}
            </div>
          </div>
        ) : (
          <p>Requisition not found.</p>
        )}
      </PageSection>

      {/* COMMENTS */}
      <PageSection title="Comments" subtitle="Staff and investigator notes">
        {allocation.comments?.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <ul>
            {allocation.comments.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        )}

        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add comment..."
        />

        <button className="btn-small" onClick={handleAddComment}>
          Add Comment
        </button>
      </PageSection>

      {/* STAFF ACTIONS */}
      {allocation.status === "pending" && (
        <PageSection title="Staff Actions" subtitle="Confirm or adjust allocation">
          <button className="btn success" onClick={handleConfirm}>
            Confirm Allocation
          </button>

          <div className="adjust-row">
            <input
              type="number"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="Adjust quantity"
            />
            <button className="btn warning" onClick={handleAdjust}>
              Adjust Allocation
            </button>
          </div>
        </PageSection>
      )}

      {/* LINKED EXPERIMENTS */}
      <PageSection
        title="Experiments Using This Allocation"
        subtitle="Experiments linked to this allocation"
      >
        <DataTable
          rows={experiments}
          emptyText="No experiments linked."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Name", cell: (row) => row.experiment_name },
            { header: "Group ID", cell: (row) => row.group_id },
          ]}
        />
      </PageSection>
    </div>
  );
}
