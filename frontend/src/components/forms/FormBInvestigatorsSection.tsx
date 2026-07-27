import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../api/errors";
import {
  addFormBInvestigator,
  linkFormBInvestigator,
  listFormBInvestigators,
  removeFormBInvestigator,
  searchInvestigatorUsers,
  type FormBInvestigatorRecord,
  type InvestigatorUserSearchResult,
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

function InvestigatorLinkCell({
  formBId,
  investigator,
  onLinked,
}: {
  formBId: number;
  investigator: FormBInvestigatorRecord;
  onLinked: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvestigatorUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (investigator.user_id || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        setError(null);
        const rows = await searchInvestigatorUsers(query.trim());
        setResults(rows);
      } catch (searchError) {
        setError(getApiErrorMessage(searchError));
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [investigator.user_id, query]);

  if (investigator.user_id) {
    return <span className="status-pill status-pill-success">Linked (user #{investigator.user_id})</span>;
  }

  async function handleLink(userId: number) {
    try {
      setLinking(true);
      setError(null);
      await linkFormBInvestigator(formBId, investigator.id, userId);
      setQuery("");
      setResults([]);
      await onLinked();
    } catch (linkError) {
      setError(getApiErrorMessage(linkError));
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="link-cell">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name or email"
        disabled={linking}
      />
      {searching ? <small>Searching...</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
      {results.length > 0 ? (
        <div className="link-results">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              className="btn-small btn-secondary"
              disabled={linking}
              onClick={() => void handleLink(result.id)}
            >
              Link {result.name} ({result.email})
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
      <p>
        Add co-investigators, faculty, or student contributors. Link each person to their registered
        LMCP account so students can fill operational data while faculty retains oversight.
      </p>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      {loading ? <p>Loading investigators...</p> : null}

      {!loading && investigators.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Type</th>
              <th>Account</th>
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
                  <InvestigatorLinkCell
                    formBId={formBId}
                    investigator={investigator}
                    onLinked={loadInvestigators}
                  />
                </td>
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
