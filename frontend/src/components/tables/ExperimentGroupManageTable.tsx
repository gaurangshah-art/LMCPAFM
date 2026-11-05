import { useState } from "react";
import { deleteGroup, updateGroup } from "../../api/iaecApi";
import { getApiErrorMessage } from "../../api/errors";
import type { ExperimentGroup, ExperimentGroupAssignmentSummary } from "../../api/types";
import { ErrorAlert } from "../common/ErrorAlert";

interface ExperimentGroupManageTableProps {
  groups: ExperimentGroup[];
  assignments?: ExperimentGroupAssignmentSummary[];
  onChanged: () => void;
}

export function ExperimentGroupManageTable({
  groups,
  assignments = [],
  onChanged,
}: ExperimentGroupManageTableProps) {
  const assignmentByGroupId = new Map(assignments.map((row) => [row.group_id, row]));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCount, setEditCount] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function startEdit(group: ExperimentGroup) {
    setEditingId(group.id);
    setEditName(group.name);
    setEditCount(group.planned_animal_count);
    setErrorMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setErrorMessage(null);
  }

  async function saveEdit(groupId: number) {
    setBusyId(groupId);
    setErrorMessage(null);
    try {
      await updateGroup(groupId, {
        name: editName.trim(),
        planned_animal_count: editCount,
      });
      setEditingId(null);
      onChanged();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(group: ExperimentGroup) {
    if (
      !window.confirm(
        `Delete experiment group "${group.name}"? This cannot be undone if animals or logs are linked.`,
      )
    ) {
      return;
    }

    setBusyId(group.id);
    setErrorMessage(null);
    try {
      await deleteGroup(group.id);
      if (editingId === group.id) {
        setEditingId(null);
      }
      onChanged();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  if (groups.length === 0) {
    return <p>No experiment groups yet. Create one below or re-sync from Annexure I.</p>;
  }

  return (
    <>
      {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Name</th>
              <th>Planned</th>
              <th>Assigned</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const summary = assignmentByGroupId.get(group.id);
              const isEditing = editingId === group.id;
              const isBusy = busyId === group.id;

              return (
                <tr key={group.id}>
                  <td>
                    {group.form_b_study_group_id ? (
                      <span className="role-badge">Annexure I</span>
                    ) : (
                      <span className="role-badge">Added later</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        aria-label={`Edit name for group ${group.id}`}
                      />
                    ) : (
                      group.name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={editCount}
                        onWheel={(event) => event.currentTarget.blur()}
                        onChange={(event) => setEditCount(Number(event.target.value))}
                        aria-label={`Edit planned count for group ${group.id}`}
                      />
                    ) : (
                      group.planned_animal_count
                    )}
                  </td>
                  <td>
                    {summary
                      ? `${summary.assigned_count}/${group.planned_animal_count}`
                      : `0/${group.planned_animal_count}`}
                  </td>
                  <td>
                    <div className="table-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-small"
                            disabled={isBusy}
                            onClick={() => void saveEdit(group.id)}
                          >
                            {isBusy ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-small"
                            disabled={isBusy}
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-secondary btn-small"
                            disabled={isBusy}
                            onClick={() => startEdit(group)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-small"
                            disabled={isBusy}
                            onClick={() => void handleDelete(group)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
