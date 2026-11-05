import { useState } from "react";
import { assignGroupAnimals, downloadGroupCageLabels } from "../../api/iaecApi";
import type { ExperimentGroupAssignmentSummary, ProjectUnassignedAnimal } from "../../api/types";
import { getApiErrorMessage } from "../../api/errors";
import { ErrorAlert } from "../common/ErrorAlert";
import { DataTable } from "../tables/DataTable";

interface GroupAssignmentPanelProps {
  assignments: ExperimentGroupAssignmentSummary[];
  unassignedAnimals: ProjectUnassignedAnimal[];
  onUpdated: () => void | Promise<void>;
}

export function GroupAssignmentPanel({
  assignments,
  unassignedAnimals,
  onUpdated,
}: GroupAssignmentPanelProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAssign() {
    if (!selectedGroupId || selectedAnimalIds.length === 0) {
      setError("Select a group and at least one unassigned animal.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      await assignGroupAnimals(selectedGroupId, selectedAnimalIds);
      setMessage(`Assigned ${selectedAnimalIds.length} animal(s) to the group.`);
      setSelectedAnimalIds([]);
      await onUpdated();
    } catch (assignError) {
      setError(getApiErrorMessage(assignError));
    } finally {
      setBusy(false);
    }
  }

  async function handlePrintGroupLabels(groupId: number) {
    try {
      setBusy(true);
      setError(null);
      await downloadGroupCageLabels(groupId);
      setMessage("Group cage labels downloaded.");
    } catch (printError) {
      setError(getApiErrorMessage(printError));
    } finally {
      setBusy(false);
    }
  }

  function toggleAnimal(animalId: number) {
    setSelectedAnimalIds((current) =>
      current.includes(animalId)
        ? current.filter((id) => id !== animalId)
        : [...current, animalId],
    );
  }

  return (
    <div className="group-assignment-panel">
      {error ? <ErrorAlert message={error} /> : null}
      {message ? <p className="success-text">{message}</p> : null}

      <DataTable
        rows={assignments}
        emptyText="Create experiment groups in the Plan tab first."
        columns={[
          { header: "Group", cell: (row) => row.group_name },
          {
            header: "Assigned",
            cell: (row) => `${row.assigned_count}/${row.planned_animal_count}`,
          },
          { header: "Cages", cell: (row) => row.cage_count },
          {
            header: "Labels",
            cell: (row) => (
              <button
                type="button"
                className="btn-secondary btn-small"
                disabled={busy || row.assigned_count === 0}
                onClick={() => void handlePrintGroupLabels(row.group_id)}
              >
                Print group cage labels
              </button>
            ),
          },
        ]}
      />

      {unassignedAnimals.length > 0 ? (
        <div className="form-grid">
          <label>
            Target group
            <select
              value={selectedGroupId || ""}
              onChange={(event) => setSelectedGroupId(Number(event.target.value))}
            >
              <option value="">Select group</option>
              {assignments.map((group) => (
                <option key={group.group_id} value={group.group_id}>
                  {group.group_name} ({group.assigned_count}/{group.planned_animal_count})
                </option>
              ))}
            </select>
          </label>

          <div className="full-width">
            <strong>Unassigned allocated animals</strong>
            <ul className="checkbox-list">
              {unassignedAnimals.map((animal) => (
                <li key={animal.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedAnimalIds.includes(animal.id)}
                      onChange={() => toggleAnimal(animal.id)}
                    />
                    {animal.animal_number ?? `#${animal.id}`} · {animal.status}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <button type="button" className="btn" disabled={busy} onClick={() => void handleAssign()}>
            Assign selected animals to group
          </button>
        </div>
      ) : null}
    </div>
  );
}
