import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import { getProjectWorkspace } from "../api/iaecApi";
import type { ProjectWorkspace, User } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { ExperimentForm } from "../components/forms/ExperimentForm";
import { ExperimentGroupForm } from "../components/forms/ExperimentGroupForm";
import { RequisitionForm } from "../components/forms/RequisitionForm";
import { ExperimentGroupTable } from "../components/tables/ExperimentGroupTable";
import { GroupAssignmentPanel } from "../components/facility/GroupAssignmentPanel";
import { DataTable } from "../components/tables/DataTable";
import { formatDisplayDate } from "../utils/dateFormat";
import { projectStatusLabel } from "../utils/projectStatus";

type WorkspaceTab = "overview" | "plan" | "request" | "run";

interface ProjectWorkspacePageProps {
  currentUser: User;
}

function WorkflowStep({
  label,
  complete,
  detail,
}: {
  label: string;
  complete: boolean;
  detail?: string;
}) {
  return (
    <div className={`workflow-step ${complete ? "workflow-step-complete" : ""}`}>
      <strong>{complete ? "✓" : "○"} {label}</strong>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}

export function ProjectWorkspacePage({ currentUser }: ProjectWorkspacePageProps) {
  const { projectId } = useParams();
  const numericProjectId = Number(projectId);
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  async function loadWorkspace() {
    if (!numericProjectId || Number.isNaN(numericProjectId)) {
      setError("Invalid project id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getProjectWorkspace(numericProjectId);
      setWorkspace(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [numericProjectId]);

  const defaultTab = useMemo<WorkspaceTab>(() => {
    if (!workspace) return "overview";
    if (!workspace.workflow.planning_complete) return "plan";
    if (!workspace.workflow.has_requisition) return "request";
    if (!workspace.workflow.has_experiment_log) return "run";
    return "overview";
  }, [workspace]);

  useEffect(() => {
    if (workspace) {
      setActiveTab(defaultTab);
    }
  }, [workspace, defaultTab]);

  if (loading) return <LoadingState label="Loading project workspace..." />;
  if (error) return <ErrorAlert message={error} />;
  if (!workspace) return <ErrorAlert message="Project workspace not found." />;

  const { project, planning, workflow } = workspace;

  return (
    <div className="page-grid">
      <section className="hero-panel hero-panel-wide">
        <p className="eyebrow">Project workspace</p>
        <h1>{project.title}</h1>
        <p>
          Protocol {project.protocol_number ?? "pending"} · {projectStatusLabel(project.status)}
        </p>
        <div className="quick-nav-grid dashboard-quick-actions">
          {(["overview", "plan", "request", "run"] as WorkspaceTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "btn" : "btn btn-secondary"}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview"
                ? "Overview"
                : tab === "plan"
                  ? "Plan Groups"
                  : tab === "request"
                    ? "Request Animals"
                    : "Log Experiments"}
            </button>
          ))}
          {workspace.form_b_id ? (
            workspace.form_b_submitted ? (
              <Link className="btn btn-secondary" to={`/form-b/view?formBId=${workspace.form_b_id}`}>
                View submitted Form B
              </Link>
            ) : (
              <Link className="btn btn-secondary" to={`/form-b/step-1?formBId=${workspace.form_b_id}`}>
                Continue Form B
              </Link>
            )
          ) : null}
        </div>
      </section>

      {activeTab === "overview" ? (
        <>
          <PageSection title="Workflow Progress" subtitle="Approval → groups → requisition → allocation → logs">
            <div className="workflow-grid">
              <WorkflowStep
                label="Experiment groups planned"
                complete={workflow.planning_complete}
                detail={planning.message ?? undefined}
              />
              <WorkflowStep
                label="Requisition submitted"
                complete={workflow.has_requisition}
                detail={`${workspace.requisitions.length} requisition(s)`}
              />
              <WorkflowStep
                label="Animals allocated"
                complete={workflow.has_allocation}
                detail={`${workspace.allocations.length} allocation(s)`}
              />
              <WorkflowStep
                label="Experiment logs recorded"
                complete={workflow.has_experiment_log}
                detail={`${workspace.experiments.length} log(s)`}
              />
            </div>
          </PageSection>

          <PageSection title="Project Team" subtitle="Linked accounts can access this workspace">
            <DataTable
              rows={workspace.investigators}
              emptyText="No investigators listed on Form B."
              columns={[
                { header: "Name", cell: (row) => row.name },
                { header: "Role", cell: (row) => row.project_role },
                { header: "Type", cell: (row) => row.investigator_type ?? "—" },
                {
                  header: "Account",
                  cell: (row) => (row.is_linked ? `Linked (#${row.user_id})` : "Not linked"),
                },
                {
                  header: "Can edit",
                  cell: (row) =>
                    workspace.form_b_submitted ? "No (submitted)" : row.can_edit_forms ? "Yes" : "No",
                },
              ]}
            />
          </PageSection>
        </>
      ) : null}

      {activeTab === "plan" ? (
        <>
          <PageSection title="Planning Summary" subtitle="Total planned animals must stay within IAEC approval">
            <div className="info-card compact-info-card">
              <p>Approved animals: {planning.approved_animal_count ?? "—"}</p>
              <p>Planned total: {planning.planned_animal_total}</p>
              <p>Remaining capacity: {planning.remaining_animals ?? "—"}</p>
              <p>{planning.message}</p>
            </div>
          </PageSection>

          <PageSection title="Create Experiment Group">
            <ExperimentGroupForm
              defaultProjectId={numericProjectId}
              onCreated={() => void loadWorkspace()}
            />
          </PageSection>

          <PageSection title="Existing Groups">
            <ExperimentGroupTable
              groups={workspace.groups}
              assignments={workspace.group_assignments}
            />
          </PageSection>
        </>
      ) : null}

      {activeTab === "request" ? (
        <>
          <PageSection title="Requisition Status">
            <div className={`info-card ${workflow.can_create_requisition ? "" : "warning-card"}`}>
              <p>{planning.message}</p>
            </div>
          </PageSection>

          <PageSection title="Create Requisition">
            <RequisitionForm
              currentUser={currentUser}
              defaultProtocolId={numericProjectId}
              onCreated={() => void loadWorkspace()}
            />
          </PageSection>

          <PageSection title="Submitted Requisitions">
            <DataTable
              rows={workspace.requisitions}
              emptyText="No requisitions yet."
              columns={[
                { header: "ID", cell: (row) => row.id },
                { header: "Date", cell: (row) => formatDisplayDate(row.date) },
                { header: "Requester", cell: (row) => row.requester_name },
                { header: "Animals", cell: (row) => row.requested_total },
                {
                  header: "View",
                  cell: (row) => <Link to={`/requisitions/${row.id}`}>Open</Link>,
                },
              ]}
            />
          </PageSection>
        </>
      ) : null}

      {activeTab === "run" ? (
        <>
          <PageSection title="Group assignment and cage labels" subtitle="Assign allocated animals to experiment groups before logging experiments">
            <GroupAssignmentPanel
              assignments={workspace.group_assignments}
              unassignedAnimals={workspace.unassigned_animals}
              onUpdated={loadWorkspace}
            />
          </PageSection>

          <PageSection title="Allocations" subtitle="Experiment logs require an allocation and experiment group">
            <DataTable
              rows={workspace.allocations}
              emptyText="No allocations yet. Staff must allocate animals after requisition approval."
              columns={[
                { header: "ID", cell: (row) => row.id },
                { header: "Date", cell: (row) => formatDisplayDate(row.date) },
                { header: "By", cell: (row) => row.allocated_by },
                {
                  header: "View",
                  cell: (row) => <Link to={`/allocations/${row.id}`}>Open</Link>,
                },
              ]}
            />
          </PageSection>

          <PageSection title="Log Experiment">
            <ExperimentForm
              defaultProtocolId={numericProjectId}
              onCreated={() => void loadWorkspace()}
            />
          </PageSection>

          <PageSection title="Recorded Experiment Logs">
            <DataTable
              rows={workspace.experiments}
              emptyText="No experiment logs yet."
              columns={[
                { header: "ID", cell: (row) => row.id },
                { header: "Group", cell: (row) => row.experiment_group_id },
                { header: "Date", cell: (row) => formatDisplayDate(row.date) },
                { header: "Performed By", cell: (row) => row.performed_by },
                { header: "Animals", cell: (row) => row.animal_count },
                { header: "Procedure", cell: (row) => row.procedure },
              ]}
            />
          </PageSection>
        </>
      ) : null}
    </div>
  );
}
