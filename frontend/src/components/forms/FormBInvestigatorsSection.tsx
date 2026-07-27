import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../api/errors";
import {
  addFormBInvestigator,
  listFormBInvestigators,
  removeFormBInvestigator,
  type FormBInvestigatorRecord,
} from "../../api/formbApi";

interface FormBInvestigatorsSectionProps {
  formBId: number;
}

const PROJECT_ROLES = [
  "co_investigator",
  "investigator",
  "student_contributor",
] as const;

const INVESTIGATOR_TYPES = ["faculty", "investigator", "student", "external"] as const;

export function FormBInvestigatorsSection({ formBId }: FormBInvestigatorsSectionProps) {
  const [investigators, setInvestigators] = useState<FormBInvestigatorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [projectRole, setProjectRole] = useState<(typeof PROJECT_ROLES)[number]>("co_investigator");
  const [investigatorType, setInvestigatorType] =
    useState<(typeof INVESTIGATOR_TYPES)[number]>("faculty");
  const [saving, setSaving] = useState(false);

  async function loadInvestigators() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const rows = await listFormBInvestigators(formBId);
      setInvestigators(rows);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvestigators();
  }, [formBId]);

  async function handleAdd() {
    if (!name.trim()) {
      setErrorMessage("Investigator name is required.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      await addFormBInvestigator({
        form_b_id: formBId,
        name: name.trim(),
        project_role: projectRole,
        investigator_type: investigatorType,
      });
      setName("");
      await loadInvestigators();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(investigatorId: number) {
    if (!window.confirm("Remove this investigator from the Form B?")) return;

    try {
      await removeFormBInvestigator(formBId, investigatorId);
      await loadInvestigators();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  return (
    <section className="dashboard-section">
      <h3>Project Investigators</h3>
      <p>Add co-investigators, faculty, or student contributors. At least one LMCP faculty member is required before submission.</p>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      {loading ? <p>Loading investigators...</p> : null}

      {!loading && investigators.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Type</th>
              <th>Permissions</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {investigators.map((investigator) => (
              <tr key={investigator.id}>
                <td>{investigator.name}</td>
                <td>{investigator.project_role}</td>
                <td>{investigator.investigator_type || "-"}</td>
                <td>
                  {[
                    investigator.can_view_status ? "status" : null,
                    investigator.can_edit_forms ? "edit" : null,
                    investigator.can_submit_form_b ? "submit" : null,
                    investigator.can_view_approval_letters ? "letters" : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "none"}
                </td>
                <td>
                  {investigator.project_role !== "principal_investigator" ? (
                    <button
                      type="button"
                      className="btn-small"
                      onClick={() => void handleRemove(investigator.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div className="form-grid">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Project role
          <select value={projectRole} onChange={(e) => setProjectRole(e.target.value as typeof projectRole)}>
            {PROJECT_ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Investigator type
          <select
            value={investigatorType}
            onChange={(e) => setInvestigatorType(e.target.value as typeof investigatorType)}
          >
            {INVESTIGATOR_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" className="btn-secondary" onClick={() => void handleAdd()} disabled={saving}>
        {saving ? "Adding..." : "Add Investigator"}
      </button>
    </section>
  );
}
