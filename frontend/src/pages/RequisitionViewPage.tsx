import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getRequisitionById,
  getAllocationsByRequisition,
  getExperimentsByRequisition,
  addRequisitionComment,
  approveRequisitionStaff,
  approveRequisitionIAEC,
  
} from "../api/requisitionApi";

import type {
  Requisition,
  Allocation,
  AnimalExperiment,
} from "../api/types";

import { PageSection } from "../components/common/PageSection";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { DataTable } from "../components/tables/DataTable";

export function RequisitionViewPage() {
  const { id } = useParams();
  const requisitionId = Number(id);
  const navigate = useNavigate();

  const [req, setReq] = useState<Requisition | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [experiments, setExperiments] = useState<AnimalExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  async function loadAll() {
    try {
      setLoading(true);

      const r = await getRequisitionById(requisitionId);
      setReq(r);

      const alloc = await getAllocationsByRequisition(requisitionId);
      setAllocations(alloc);

      const exp = await getExperimentsByRequisition(requisitionId);
      setExperiments(exp);

    } catch {
      setError("Failed to load requisition.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [requisitionId]);

  async function handleAddComment() {
    if (!commentText.trim()) return;

    try {
      const updated = await addRequisitionComment(requisitionId, commentText);
      setReq(updated);
      setCommentText("");
    } catch {
      alert("Failed to add comment.");
    }
  }

  async function handleStaffApprove() {
    try {
      const updated = await approveRequisitionStaff(requisitionId);
      setReq(updated);
    } catch {
      alert("Failed to approve requisition.");
    }
  }

  async function handleStaffReject() {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      const updated = await rejectRequisitionStaff(requisitionId, reason);
      setReq(updated);
    } catch {
      alert("Failed to reject requisition.");
    }
  }

  async function handleIAECApprove() {
    try {
      const updated = await approveRequisitionIAEC(requisitionId);
      setReq(updated);
    } catch {
      alert("Failed to approve requisition.");
    }
  }

  async function handleIAECReject() {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      const updated = await rejectRequisitionIAEC(requisitionId, reason);
      setReq(updated);
    } catch {
      alert("Failed to reject requisition.");
    }
  }

  if (loading) return <LoadingState label="Loading requisition..." />;
  if (error) return <ErrorAlert message={error} />;
  if (!req) return <ErrorAlert message="Requisition not found." />;

  return (
    <div className="page-grid">
      {/* DETAILS */}
      <PageSection
        title={`Requisition #${req.id}`}
        subtitle="Full requisition details"
      >
        <div className="detail-grid">
          <div>
            <strong>Investigator:</strong> {req.investigator_name}
          </div>
          <div>
            <strong>Species:</strong> {req.species}
          </div>
          <div>
            <strong>Quantity:</strong> {req.quantity}
          </div>
          <div>
            <strong>Purpose:</strong> {req.purpose}
          </div>
          <div>
            <strong>Status:</strong>{" "}
            <span className={`status-tag status-${req.status}`}>
              {req.status}
            </span>
          </div>
        </div>

        <button className="btn-small" onClick={() => navigate("/requisitions")}>
          ← Back to Requisitions
        </button>
      </PageSection>

      {/* STATUS TIMELINE */}
      <PageSection title="Status Timeline" subtitle="Workflow history">
        <ul className="timeline">
          <li>Submitted: {req.submitted_at}</li>
          <li>Staff Review: {req.staff_review_at ?? "Pending"}</li>
          <li>IAEC Review: {req.iaec_review_at ?? "Pending"}</li>
          <li>Final Status: {req.status}</li>
        </ul>
      </PageSection>

      {/* COMMENTS */}
      <PageSection title="Comments" subtitle="Investigator, Staff, IAEC">
        {req.comments?.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <ul>
            {req.comments.map((c, idx) => (
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
      {req.status === "submitted" && (
        <PageSection title="Staff Actions" subtitle="Review requisition">
          <button className="btn success" onClick={handleStaffApprove}>
            Approve (Staff)
          </button>
          <button className="btn warning" onClick={handleStaffReject}>
            Reject (Staff)
          </button>
        </PageSection>
      )}

      {/* IAEC ACTIONS */}
      {req.status === "staff_approved" && (
        <PageSection title="IAEC Actions" subtitle="Final approval">
          <button className="btn success" onClick={handleIAECApprove}>
            Approve (IAEC)
          </button>
          <button className="btn warning" onClick={handleIAECReject}>
            Reject (IAEC)
          </button>
        </PageSection>
      )}

      {/* ALLOCATIONS */}
      <PageSection title="Allocations" subtitle="Animals allocated">
        <DataTable
          rows={allocations}
          emptyText="No allocations yet."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Quantity", cell: (row) => row.quantity },
            { header: "Date", cell: (row) => row.date },
            { header: "Staff", cell: (row) => row.staff_name },
          ]}
        />
      </PageSection>

      {/* EXPERIMENTS */}
      <PageSection title="Experiments" subtitle="Experiments using this requisition">
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
