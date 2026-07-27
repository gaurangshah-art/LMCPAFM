import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import { getInvestigatorProjectSummaries } from "../api/iaecApi";
import { getMyInvestigatorProfile, type InvestigatorProfile } from "../api/investigatorProfileApi";
import type { InvestigatorProjectSummary, User } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { DataTable } from "../components/tables/DataTable";
import { formatDisplayDate } from "../utils/dateFormat";
import {
  isApprovedProject,
  isOngoingProject,
  isRejectedProject,
  projectStatusClass,
  projectStatusLabel,
} from "../utils/projectStatus";

interface InvestigatorDashboardProps {
  currentUser: User;
}

function ProjectStatusBadge({ status }: { status?: string | null }) {
  return <span className={projectStatusClass(status)}>{projectStatusLabel(status)}</span>;
}

export function InvestigatorDashboardPage({ currentUser }: InvestigatorDashboardProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<InvestigatorProjectSummary[]>([]);
  const [profile, setProfile] = useState<InvestigatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [projectRows, profileRow] = await Promise.all([
          getInvestigatorProjectSummaries(currentUser.id),
          getMyInvestigatorProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setProjects(projectRows);
        setProfile(profileRow);
      } catch (loadError) {
        if (!cancelled) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser.id]);

  const ongoingProjects = useMemo(
    () => projects.filter((project) => isOngoingProject(project.status)),
    [projects],
  );
  const approvedProjects = useMemo(
    () => projects.filter((project) => isApprovedProject(project.status)),
    [projects],
  );
  const rejectedProjects = useMemo(
    () => projects.filter((project) => isRejectedProject(project.status)),
    [projects],
  );

  if (loading) return <LoadingState label="Loading your dashboard..." />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div className="page-grid">
      <section className="hero-panel hero-panel-wide">
        <p className="eyebrow">Investigator dashboard</p>
        <h1>Welcome back, {currentUser.name}</h1>
        <p>
          Track Form B applications, IAEC project IDs, approval status, and certificates from one
          place.
        </p>
        {profile ? (
          <p>
            {profile.department ? `${profile.department}` : "Investigator"}
            {profile.designation ? ` · ${profile.designation}` : ""}
            {!profile.is_complete ? (
              <>
                {" "}
                · <Link to="/investigator-profile?complete=1">Complete your profile</Link>
              </>
            ) : null}
          </p>
        ) : null}
        <div className="quick-nav-grid dashboard-quick-actions">
          <button type="button" className="btn" onClick={() => navigate("/form-b/step-1")}>
            New Form B
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/requisitions")}>
            Requisitions
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/experiment-groups")}>
            Experiment Groups
          </button>
        </div>
      </section>

      <PageSection title="Overview" subtitle="Your IAEC workflow at a glance">
        <div className="summary-grid">
          <div className="summary-card">
            <h4>Total Projects</h4>
            <p>{projects.length}</p>
          </div>
          <div className="summary-card">
            <h4>In Progress</h4>
            <p>{ongoingProjects.length}</p>
          </div>
          <div className="summary-card">
            <h4>Approved</h4>
            <p>{approvedProjects.length}</p>
          </div>
          <div className="summary-card">
            <h4>Rejected</h4>
            <p>{rejectedProjects.length}</p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Ongoing Projects"
        subtitle="Draft, submitted, and under-review Form B applications"
      >
        <DataTable
          rows={ongoingProjects}
          emptyText="No ongoing projects. Start a new Form B application when ready."
          columns={[
            { header: "Project ID", cell: (row) => row.id },
            { header: "Form B ID", cell: (row) => row.form_b_id ?? "—" },
            {
              header: "IAEC Protocol No.",
              cell: (row) => row.protocol_number ?? "Pending assignment",
            },
            { header: "Title", cell: (row) => row.title },
            {
              header: "Status",
              cell: (row) => <ProjectStatusBadge status={row.status} />,
            },
            {
              header: "Submitted",
              cell: (row) => formatDisplayDate(row.submitted_at),
            },
            {
              header: "Actions",
              cell: (row) => (
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={() => navigate(`/projects/${row.id}`)}
                >
                  Open
                </button>
              ),
            },
          ]}
        />
      </PageSection>

      <PageSection
        title="Approved Projects & Certificates"
        subtitle="Completed IAEC approvals with protocol numbers and certificate access"
      >
        <DataTable
          rows={approvedProjects}
          emptyText="No approved projects yet."
          columns={[
            { header: "Project ID", cell: (row) => row.id },
            { header: "Form B ID", cell: (row) => row.form_b_id ?? "—" },
            {
              header: "IAEC Protocol No.",
              cell: (row) => row.protocol_number ?? "—",
            },
            { header: "Title", cell: (row) => row.title },
            {
              header: "Approved",
              cell: (row) => formatDisplayDate(row.approval_date),
            },
            {
              header: "Meeting",
              cell: (row) =>
                row.meeting_year && row.meeting_number
                  ? `${row.meeting_year} / ${row.meeting_number}`
                  : "—",
            },
            {
              header: "Groups / Experiments",
              cell: (row) => `${row.experiment_group_count} / ${row.experiment_count}`,
            },
            {
              header: "Certificate",
              cell: (row) => (
                <div className="table-action-group">
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => navigate(`/projects/${row.id}`)}
                  >
                    Workspace
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => navigate(`/iaec/project/${row.id}/certificate`)}
                    title="Provisional until all experiment records are complete"
                  >
                    Certificate
                  </button>
                </div>
              ),
            },
          ]}
        />
      </PageSection>

      {rejectedProjects.length > 0 ? (
        <PageSection title="Rejected Projects" subtitle="Applications not approved by IAEC">
          <DataTable
            rows={rejectedProjects}
            emptyText="No rejected projects."
            columns={[
              { header: "Project ID", cell: (row) => row.id },
              { header: "Form B ID", cell: (row) => row.form_b_id ?? "—" },
              { header: "Title", cell: (row) => row.title },
              {
                header: "Status",
                cell: (row) => <ProjectStatusBadge status={row.status} />,
              },
              {
                header: "Actions",
                cell: (row) => (
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => navigate(`/projects/${row.id}`)}
                  >
                    View
                  </button>
                ),
              },
            ]}
          />
        </PageSection>
      ) : null}
    </div>
  );
}
