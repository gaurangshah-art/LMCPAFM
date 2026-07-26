import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getAllocation,
  getRequisitionById,
  getExperimentsByAllocation,
} from "../api/requisitionApi";

import type {
  Allocation,
  Requisition,
  AnimalExperiment,
} from "../api/types";

import { formatDisplayDate } from "../utils/dateFormat";
import { PageSection } from "../components/common/PageSection";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { DataTable } from "../components/tables/DataTable";

type LoadedRequisition = {
  id: number;
  protocol_id: number;
  requester_name: string;
  purpose: string;
  items: Array<{ requested_count: number; species_id: number; strain_id: number }>;
};

function toRequisitionView(req: LoadedRequisition): Requisition {
  const firstItem = req.items[0];
  const totalRequested = req.items.reduce((sum, item) => sum + item.requested_count, 0);
  return {
    id: req.id,
    lmcp_iaec_id: String(req.protocol_id),
    investigator_name: req.requester_name,
    species: firstItem ? `Species #${firstItem.species_id}` : "—",
    strain: firstItem ? `Strain #${firstItem.strain_id}` : "—",
    sex: "—",
    age: "—",
    quantity_requested: totalRequested,
    purpose: req.purpose,
    status: "linked",
    comments: [],
  };
}

function toAllocationView(alloc: {
  id: number;
  requisition_id: number;
  date: string;
  allocated_by: string;
  remarks: string;
  items: Array<{ allocated_count: number }>;
}): Allocation {
  const totalAllocated = alloc.items.reduce((sum, item) => sum + item.allocated_count, 0);
  return {
    id: alloc.id,
    requisition_id: alloc.requisition_id,
    species: "—",
    strain: "—",
    sex: "—",
    age: "—",
    quantity_allocated: totalAllocated,
    staff_name: alloc.allocated_by,
    date: formatDisplayDate(alloc.date),
  };
}

export function AllocationViewPage() {
  const { id } = useParams();
  const allocationId = Number(id);
  const navigate = useNavigate();

  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [experiments, setExperiments] = useState<AnimalExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      const alloc = await getAllocation(allocationId);
      setAllocation(toAllocationView(alloc));

      const req = await getRequisitionById(alloc.requisition_id);
      setRequisition(toRequisitionView(req as LoadedRequisition));

      const exp = await getExperimentsByAllocation(allocationId);
      setExperiments(exp);
    } catch {
      setError("Failed to load allocation.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [allocationId]);

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
            <strong>Allocated Quantity:</strong> {allocation.quantity_allocated}
          </div>
          <div>
            <strong>Staff:</strong> {allocation.staff_name ?? "—"}
          </div>
          <div>
            <strong>Date:</strong> {formatDisplayDate(allocation.date)}
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
              <strong>Requested Quantity:</strong> {requisition.quantity_requested}
            </div>
            <div>
              <strong>Purpose:</strong> {requisition.purpose}
            </div>
          </div>
        ) : (
          <p>Requisition not found.</p>
        )}
      </PageSection>

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
