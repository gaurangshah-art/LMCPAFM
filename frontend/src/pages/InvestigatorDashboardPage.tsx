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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    if (!currentUser) return;

    try {
      setLoading(true);

      // 1️⃣ Load investigator's projects
      const proj = await getProjectsByInvestigator(currentUser.id);
      setProjects(proj);

      // 2️⃣ Load all groups for all projects
      const allGroups: ExperimentGroup[] = [];
      for (const p of proj) {
        const g = await getGroupsByProject(p.id);
        allGroups.push(...g);
      }
      setGroups(allGroups);

      // 3️⃣ Load all experiments for all groups
      const allExperiments: AnimalExperiment[] = [];
      for (const g of allGroups) {
        const e = await getIAECExperimentsByGroup(g.id);
        allExperiments.push(...e);
      }
      setExperiments(allExperiments);

    } catch {
      setError("Failed to load investigator dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) return;
    void loadAll();
  }, [currentUser?.id]);

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
