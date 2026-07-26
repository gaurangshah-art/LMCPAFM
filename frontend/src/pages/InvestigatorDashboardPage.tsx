import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getProjectsByInvestigator,
  getGroupsByProject,
  getIAECExperimentsByGroup,
} from "../api/iaecApi";

import type { IAECProject, ExperimentGroup, AnimalExperiment, User } from "../api/types";

import { PageSection } from "../components/common/PageSection";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { DataTable } from "../components/tables/DataTable";

interface InvestigatorDashboardProps {
  currentUser: User | null;
}

export function InvestigatorDashboardPage({ currentUser }: InvestigatorDashboardProps) {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<IAECProject[]>([]);
  const [groups, setGroups] = useState<ExperimentGroup[]>([]);
  const [experiments, setExperiments] = useState<AnimalExperiment[]>([]);

  const [loading, setLoading] = useState(Boolean(currentUser?.id));
  const [error, setError] = useState<string | null>(null);
  const investigatorId = currentUser?.id;
  const [prevInvestigatorId, setPrevInvestigatorId] = useState(investigatorId);

  if (prevInvestigatorId !== investigatorId) {
    setPrevInvestigatorId(investigatorId);
    setLoading(Boolean(investigatorId));
  }

  useEffect(() => {
    if (!investigatorId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const proj = await getProjectsByInvestigator(investigatorId);
        if (cancelled) return;
        setProjects(proj);

        const allGroups: ExperimentGroup[] = [];
        for (const p of proj) {
          const g = await getGroupsByProject(p.id);
          if (cancelled) return;
          allGroups.push(...g);
        }
        setGroups(allGroups);

        const allExperiments: AnimalExperiment[] = [];
        for (const g of allGroups) {
          const e = await getIAECExperimentsByGroup(g.id);
          if (cancelled) return;
          allExperiments.push(...e);
        }
        setExperiments(allExperiments);
      } catch {
        if (!cancelled) {
          setError("Failed to load investigator dashboard.");
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
  }, [investigatorId]);

  if (!currentUser) return <ErrorAlert message="User session required." />;
  if (loading) return <LoadingState label="Loading your IAEC workflow..." />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div className="page-grid">
      {/* PROJECTS */}
      <PageSection
        title="My IAEC Projects"
        subtitle="Projects submitted by you"
      >
        <DataTable
          rows={projects}
          emptyText="You have not submitted any IAEC projects."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Title", cell: (row) => row.title },
            { header: "Status", cell: (row) => row.status },
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

      {/* GROUPS */}
      <PageSection
        title="My Experiment Groups"
        subtitle="Groups created under your IAEC projects"
      >
        <DataTable
          rows={groups}
          emptyText="No experiment groups found."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Project ID", cell: (row) => row.project_id },
            { header: "Group Name", cell: (row) => row.name },
            {
              header: "Actions",
              cell: (row) => (
                <button
                  className="btn-small"
                  onClick={() => navigate(`/experiment-groups?project=${row.project_id}`)}
                >
                  View Groups
                </button>
              ),
            },
          ]}
        />
      </PageSection>

      {/* EXPERIMENTS */}
      <PageSection
        title="My Experiments"
        subtitle="Experiments created under your groups"
      >
        <DataTable
          rows={experiments}
          emptyText="No experiments found."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Group ID", cell: (row) => row.group_id },
            { header: "Experiment Name", cell: (row) => row.experiment_name },
            {
              header: "Actions",
              cell: (row) => (
                <button
                  className="btn-small"
                  onClick={() => navigate(`/experiments?group=${row.group_id}`)}
                >
                  View Experiments
                </button>
              ),
            },
          ]}
        />
      </PageSection>
    </div>
  );
}
