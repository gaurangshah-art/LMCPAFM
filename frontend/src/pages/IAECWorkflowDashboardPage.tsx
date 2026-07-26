import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getProjects,
  approveProject,
  rejectProject,
} from "../api/iaecApi";

import type { IAECProject } from "../api/types";

import { PageSection } from "../components/common/PageSection";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { DataTable } from "../components/tables/DataTable";

export function IAECWorkflowDashboardPage() {
  const [projects, setProjects] = useState<IAECProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  async function loadProjects() {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
    } catch {
      setError("Failed to load IAEC workflow data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function handleApprove(id: number) {
    try {
      await approveProject(id);
      void loadProjects();
    } catch {
      alert("Failed to approve project.");
    }
  }

  async function handleReject(id: number) {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      await rejectProject(id, reason);
      void loadProjects();
    } catch {
      alert("Failed to reject project.");
    }
  }

  const pending = projects.filter((p) => p.status === "pending");
  const approved = projects.filter((p) => p.status === "approved");
  const rejected = projects.filter((p) => p.status === "rejected");

  if (loading) return <LoadingState label="Loading IAEC workflow..." />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div className="page-grid">
      {/* SUMMARY */}
      <PageSection title="IAEC Workflow Summary" subtitle="Overview of project statuses">
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Pending</h3>
            <p>{pending.length}</p>
          </div>

          <div className="summary-card">
            <h3>Approved</h3>
            <p>{approved.length}</p>
          </div>

          <div className="summary-card">
            <h3>Rejected</h3>
            <p>{rejected.length}</p>
          </div>
        </div>
      </PageSection>

      {/* PENDING PROJECTS */}
      <PageSection title="Pending IAEC Projects" subtitle="Awaiting IAEC review">
        <DataTable
          rows={pending}
          emptyText="No pending projects."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Title", cell: (row) => row.title },
            { header: "Investigator", cell: (row) => row.investigator_name },
            {
              header: "Actions",
              cell: (row) => (
                <div className="actions">
                  <button
                    className="btn-small"
                    onClick={() => navigate(`/iaec-projects/${row.id}`)}
                  >
                    View
                  </button>

                  <button
                    className="btn-small success"
                    onClick={() => handleApprove(row.id)}
                  >
                    Approve
                  </button>

                  <button
                    className="btn-small warning"
                    onClick={() => handleReject(row.id)}
                  >
                    Reject
                  </button>
                </div>
              ),
            },
          ]}
        />
      </PageSection>

      {/* APPROVED PROJECTS */}
      <PageSection title="Approved IAEC Projects" subtitle="Completed IAEC review">
        <DataTable
          rows={approved}
          emptyText="No approved projects."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Title", cell: (row) => row.title },
            { header: "Investigator", cell: (row) => row.investigator_name },
            {
              header: "Actions",
              cell: (row) => (
                <button
                  className="btn-small"
                  onClick={() => navigate(`/iaec-projects/${row.id}`)}
                >
                  View
                </button>
              ),
            },
          ]}
        />
      </PageSection>

      {/* REJECTED PROJECTS */}
      <PageSection title="Rejected IAEC Projects" subtitle="Projects not approved">
        <DataTable
          rows={rejected}
          emptyText="No rejected projects."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Title", cell: (row) => row.title },
            { header: "Investigator", cell: (row) => row.investigator_name },
            {
              header: "Actions",
              cell: (row) => (
                <button
                  className="btn-small"
                  onClick={() => navigate(`/iaec-projects/${row.id}`)}
                >
                  View
                </button>
              ),
            },
          ]}
        />
      </PageSection>
    </div>
  );
}
