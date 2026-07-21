import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function RequisitionViewPage() {
  const { requisitionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [req, setReq] = useState(null);
  const [remarks, setRemarks] = useState("");

  async function loadRequisition() {
    setLoading(true);
    try {
      const res = await api.get(`/requisition/${requisitionId}`);
      setReq(res.data);
    } catch {
      alert("Failed to load requisition.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequisition();
  }, [requisitionId]);

  async function approve() {
    if (!window.confirm("Approve this requisition?")) return;

    try {
      await api.post(`/requisition/${requisitionId}/approve`, {
        remarks,
      });
      alert("Requisition approved.");
      navigate("/requisition/manage");
    } catch {
      alert("Failed to approve requisition.");
    }
  }

  async function reject() {
    if (!window.confirm("Reject this requisition?")) return;

    try {
      await api.post(`/requisition/${requisitionId}/reject`, {
        remarks,
      });
      alert("Requisition rejected.");
      navigate("/requisition/manage");
    } catch {
      alert("Failed to reject requisition.");
    }
  }

  if (loading || !req) {
    return (
      <div className="page-card">
        <p>Loading requisition...</p>
      </div>
    );
  }

  const isPending = req.status === "pending";
  const isApproved = req.status === "approved";
  const isRejected = req.status === "rejected";

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Requisition Details</h2>
        <p>LMCP/IAEC ID: {req.lmcp_iaec_id}</p>
      </header>

      <div className="form-grid">

        <label>
          Species
          <input type="text" value={req.species} readOnly />
        </label>

        <label>
          Strain
          <input type="text" value={req.strain} readOnly />
        </label>

        <label>
          Sex
          <input type="text" value={req.sex} readOnly />
        </label>

        <label>
          Age
          <input type="text" value={req.age} readOnly />
        </label>

        <label>
          Quantity Requested
          <input type="text" value={req.quantity_requested} readOnly />
        </label>

        <label>
          Purpose
          <textarea value={req.purpose} readOnly />
        </label>

        <label>
          Status
          <input type="text" value={req.status.toUpperCase()} readOnly />
        </label>

        {req.approved_at && (
          <label>
            Approved At
            <input type="text" value={req.approved_at} readOnly />
          </label>
        )}

        {req.remarks && (
          <label>
            Remarks
            <textarea value={req.remarks} readOnly />
          </label>
        )}

      </div>

      {/* Approval Section (Animal House Only) */}
      {isPending && (
        <section className="review-section">
          <h3>Animal House Decision</h3>

          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter remarks (optional)..."
          />

          <div className="wizard-actions">
            <button className="btn-secondary" onClick={() => navigate("/requisition/manage")}>
              ← Back
            </button>

            <button className="btn" onClick={approve}>
              Approve →
            </button>

            <button className="btn-danger" onClick={reject}>
              Reject →
            </button>
          </div>
        </section>
      )}

      {/* Read-only footer for approved/rejected */}
      {(isApproved || isRejected) && (
        <div className="wizard-actions">
          <button className="btn-secondary" onClick={() => navigate("/requisition/manage")}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
