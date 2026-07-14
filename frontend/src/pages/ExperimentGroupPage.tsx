import { useState } from "react";
import { getGroupsByProject, getIAECExperimentsByGroup } from "../api/iaecApi";
import { getApiErrorMessage } from "../api/errors";
import type { AnimalExperiment, ExperimentGroup } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { ExperimentGroupForm } from "../components/forms/ExperimentGroupForm";
import { IAECAnimalExperimentForm } from "../components/forms/IAECAnimalExperimentForm";
import { ExperimentGroupTable } from "../components/tables/ExperimentGroupTable";
import { IAECExperimentTable } from "../components/tables/IAECExperimentTable";

export function ExperimentGroupPage() {
  const [groups, setGroups] = useState<ExperimentGroup[]>([]);
  const [experiments, setExperiments] = useState<AnimalExperiment[]>([]);
  const [projectIdInput, setProjectIdInput] = useState("");
  const [groupIdInput, setGroupIdInput] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingExperiments, setIsLoadingExperiments] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [experimentError, setExperimentError] = useState<string | null>(null);

  async function loadGroups() {
    if (!projectIdInput) {
      setGroupError("Enter project id to load groups.");
      return;
    }

    try {
      setIsLoadingGroups(true);
      setGroupError(null);
      const data = await getGroupsByProject(Number(projectIdInput));
      setGroups(data);
    } catch (error) {
      setGroupError(getApiErrorMessage(error));
    } finally {
      setIsLoadingGroups(false);
    }
  }

  async function loadExperiments() {
    if (!groupIdInput) {
      setExperimentError("Enter group id to load IAEC experiments.");
      return;
    }

    try {
      setIsLoadingExperiments(true);
      setExperimentError(null);
      const data = await getIAECExperimentsByGroup(Number(groupIdInput));
      setExperiments(data);
    } catch (error) {
      setExperimentError(getApiErrorMessage(error));
    } finally {
      setIsLoadingExperiments(false);
    }
  }

  return (
    <div className="page-grid">
      <PageSection title="Create Experiment Group" subtitle="POST /iaec/group">
        <ExperimentGroupForm onCreated={(group) => setGroups((prev) => [group, ...prev])} />
      </PageSection>

      <PageSection title="Groups By Project" subtitle="GET /iaec/group/{project_id}">
        <div className="lookup-row">
          <input
            type="number"
            value={projectIdInput}
            onChange={(event) => setProjectIdInput(event.target.value)}
            placeholder="Project ID"
          />
          <button className="btn" type="button" onClick={() => void loadGroups()}>
            Load Groups
          </button>
        </div>
        {isLoadingGroups ? <LoadingState label="Loading groups..." /> : null}
        {groupError ? <ErrorAlert message={groupError} /> : null}
        <ExperimentGroupTable groups={groups} />
      </PageSection>

      <PageSection title="Create IAEC Experiment" subtitle="POST /iaec/experiment">
        <IAECAnimalExperimentForm onCreated={(exp) => setExperiments((prev) => [exp, ...prev])} />
      </PageSection>

      <PageSection title="IAEC Experiments By Group" subtitle="GET /iaec/experiment/{group_id}">
        <div className="lookup-row">
          <input
            type="number"
            value={groupIdInput}
            onChange={(event) => setGroupIdInput(event.target.value)}
            placeholder="Group ID"
          />
          <button className="btn" type="button" onClick={() => void loadExperiments()}>
            Load IAEC Experiments
          </button>
        </div>
        {isLoadingExperiments ? <LoadingState label="Loading IAEC experiments..." /> : null}
        {experimentError ? <ErrorAlert message={experimentError} /> : null}
        <IAECExperimentTable experiments={experiments} />
      </PageSection>
    </div>
  );
}
