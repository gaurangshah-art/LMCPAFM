import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function AllocationForm() {
  const { requisitionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [req, setReq] = useState<any>(null);

  const [quantityAllocated, setQuantityAllocated] = useState("");
  const [allocationDate, setAllocationDate] = useState("");
  const [sourceLocation, setSourceLocation] = useState("LMCP Animal House");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
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

    loadRequisition();
  }, [requisitionId]);

  function validate() {
    if (!quantityAllocated || Number(quantityAllocated) <= 0) {
      return "Allocated quantity must be > 0.";
    }
    if (Number(quantityAllocated) > req.quantity_requested) {
      return "Allocated quantity cannot exceed requested quantity.";
    }
    if (!allocationDate) return "Allocation date is required.";
    return null;
  }

  async function submitAllocation() {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);

    try {
      await api.post("/allocation", {
        requisition_id: requisitionId,
        project_id: req.project_id,
        lmcp_iaec_id: req.lmcp_iaec_id,
        species: req.species,
        strain: req.strain,
        sex: req.sex,
        age: req.age,
        quantity_requested: req.quantity_requested,
        quantity_allocated: Number(quantityAllocated),
        allocation_date: allocationDate,
        source_location: sourceLocation,
        remarks,
      });

      alert("Allocation recorded.");
      navigate("/allocation/manage");
    } catch {
      alert("Failed to record allocation.");
    } finally {
      setLoading(false);
    }
  }

  if (loading || !req) {
    return (
      <div className="page-card">
        <p>Loading requisition...</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Animal Allocation</h2>
        <p>LMCP/IAEC ID: {req.lmcp_iaec_id}</p>
        <p>Project: {req.project_title}</p>
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
          Quantity Allocated
          <input
            type="number"
            value={quantityAllocated}
            onChange={(e) => setQuantityAllocated(e.target.value)}
          />
        </label>

        <label>
          Allocation Date
          <input
            type="date"
            value={allocationDate}
            onChange={(e) => setAllocationDate(e.target.value)}
          />
        </label>

        <label>
          Source Location
          <input
            type="text"
            value={sourceLocation}
            onChange={(e) => setSourceLocation(e.target.value)}
          />
        </label>

        <label>
          Remarks
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional remarks..."
          />
        </label>
      </div>

      <div className="wizard-actions">
        <button
          className="btn-secondary"
          onClick={() => navigate("/requisition/manage")}
        >
          ← Back
        </button>

        <button
          className="btn"
          onClick={submitAllocation}
          disabled={loading}
        >
          Confirm Allocation →
        </button>
      </div>
    </div>
  );
}
