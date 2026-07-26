import { useState } from "react";
import {
  getGroupsByProject,
  getIAECExperimentsByGroup,
  createGroup,
  createIAECExperiment,
  updateIAECExperiment,
  deleteIAECExperiment,
} from "../api/iaecApi";

import {
  getApprovedExperimentGroupOptions,
  getApprovedProtocolOptions,
} from "../api/lookupApi";

import { getApiErrorMessage } from "../api/errors";

import type { AnimalExperiment, ExperimentGroup } from "../api/types";

import { useLookupOptions } from "../hooks/useLookupOptions";

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

  const approvedProtocols = useLookupOptions(getApprovedProtocolOptions);
  const approvedGroups = useLookupOptions(getApprovedExperimentGroupOptions);

  // -----------------------------
  // LOAD GROUPS
  // -----------------------------
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

  // -----------------------------
  // LOAD EXPERIMENTS
  // -----------------------------
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

  // -----------------------------
  // GROUP CRUD
  // -----------------------------
  async function handleGroupCreate(values: any) {
    try {
      const created = await createGroup(values);
      setGroups((prev) => [created, ...prev]);
    } catch (err) {
      alert("Failed to create group.");
    }
  }

  // -----------------------------
  // EXPERIMENT CRUD
  // -----------------------------
  async function handleExperimentCreate(values: any) {
    try {
      const created = await createIAECExperiment(values);
      setExperiments((prev) => [created, ...prev]);
    } catch {
      alert("Failed to create experiment.");
    }
  }

  async function handleExperimentUpdate(id: number, values: any) {
    try {
      const updated = await updateIAECExperiment(id, values);
      setExperiments((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch {
      alert("Failed to update experiment.");
    }
  }

  async function handleExperimentDelete(id: number) {
    if (!confirm("Delete this experiment?")) return;

    try {
      await deleteIAECExperiment(id);
      setExperiments((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert("Failed to delete experiment.");
    }
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="page-grid">
      {/* CREATE GROUP */}
      <PageSection title="Create Experiment Group" subtitle="POST /iaec/group">
        <ExperimentGroupForm onCreated={handleGroupCreate} />
      </PageSection>

      {/* LIST GROUPS */}
      <PageSection title="Groups By Project" subtitle="GET /iaec/group/{project_id}">
        <div className="lookup-row">
          <select
            value={projectIdInput}
            onChange={(event) => setProjectIdInput(event.target.value)}
          >
            <option value="">
              {approvedProtocols.isLoading
                ? "Loading approved protocols..."
                : "Select approved protocol"}
            </option>

            {approvedProtocols.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          <button className="btn" type="button" onClick={() => void loadGroups()}>
            Load Groups
          </button>
        </div>

        {approvedProtocols.error && <ErrorAlert message={approvedProtocols.error} />}
        {isLoadingGroups && <LoadingState label="Loading groups..." />}
        {groupError && <ErrorAlert message={groupError} />}

        <ExperimentGroupTable groups={groups} />
      </PageSection>

      {/* CREATE EXPERIMENT */}
      <PageSection title="Create IAEC Experiment" subtitle="POST /iaec/experiment">
        <IAECAnimalExperimentForm onCreated={handleExperimentCreate} />
      </PageSection>

      {/* LIST EXPERIMENTS */}
      <PageSection
        title="IAEC Experiments By Group"
        subtitle="GET /iaec/experiment/{group_id}"
      >
        <div className="lookup-row">
          <select
            value={groupIdInput}
            onChange={(event) => setGroupIdInput(event.target.value)}
          >
            <option value="">
              {approvedGroups.isLoading
                ? "Loading approved groups..."
                : "Select approved group"}
            </option>

            {approvedGroups.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          <button className="btn" type="button" onClick={() => void loadExperiments()}>
            Load IAEC Experiments
          </button>
        </div>

        {approvedGroups.error && <ErrorAlert message={approvedGroups.error} />}
        {isLoadingExperiments && <LoadingState label="Loading IAEC experiments..." />}
        {experimentError && <ErrorAlert message={experimentError} />}

        <IAECExperimentTable
          experiments={experiments}
          onEdit={handleExperimentUpdate}
          onDelete={handleExperimentDelete}
        />
      </PageSection>
    </div>
  );
}
