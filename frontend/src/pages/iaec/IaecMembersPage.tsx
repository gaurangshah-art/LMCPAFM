import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createIaecMember, getIaecMembers, updateIaecMember } from "../../api/iaecApi";
import type { IAECMemberRecord } from "../../api/types";
import { getApiErrorMessage } from "../../api/errors";

export function IaecMembersPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<IAECMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await getIaecMembers(false));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createIaecMember({
        full_name: fullName.trim(),
        designation: designation.trim(),
        display_order: Number(displayOrder) || 0,
      });
      setFullName("");
      setDesignation("");
      setDisplayOrder("0");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function toggleActive(member: IAECMemberRecord) {
    try {
      await updateIaecMember(member.id, { active: !member.active });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>IAEC members</h2>
        <p>
          Statutory composition for Schedule V attendance sheets. Add Chairperson, Member
          Secretary, CPCSEA nominees, veterinarian, and other IAEC members. Link each member to a
          user account so pre-meeting Form B review packs can be emailed, or set{" "}
          <code>IAEC_MEMBER_EMAILS</code> in the server environment.
        </p>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      <form className="form-grid" onSubmit={(e) => void handleAdd(e)}>
        <label>
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label>
          Designation in IAEC
          <input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="e.g. Member Secretary"
            required
          />
        </label>
        <label>
          Display order
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
          />
        </label>
        <div className="wizard-actions">
          <button type="submit" className="btn-primary">
            Add member
          </button>
        </div>
      </form>

      {loading ? <p>Loading members…</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Name</th>
            <th>Designation</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>{member.display_order}</td>
              <td>{member.full_name}</td>
              <td>{member.designation}</td>
              <td>{member.active ? "Active" : "Inactive"}</td>
              <td>
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => void toggleActive(member)}
                >
                  {member.active ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="wizard-actions">
        <button type="button" className="btn-secondary" onClick={() => navigate("/iaec-dashboard")}>
          Back to IAEC dashboard
        </button>
      </div>
    </div>
  );
}
