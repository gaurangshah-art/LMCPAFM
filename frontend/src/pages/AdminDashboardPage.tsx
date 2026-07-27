import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllUsers,
  getSystemActivityLogs,
  getSystemSummary,
  updateUserRoles,
} from "../api/adminApi";
import { getApiErrorMessage } from "../api/errors";
import type { ActivityLog, SystemSummary, User } from "../api/types";
import { CreateStaffUserForm } from "../components/admin/CreateStaffUserForm";
import { UserRoleEditForm } from "../components/admin/UserRoleEditForm";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { DataTable } from "../components/tables/DataTable";
import {
  type AssignableAdminRole,
  userHasInvestigatorRole,
} from "../constants/adminRoles";
import { formatDisplayDate } from "../utils/dateFormat";

interface AdminDashboardPageProps {
  currentUser: User;
}

export function AdminDashboardPage({ currentUser }: AdminDashboardPageProps) {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleSaveError, setRoleSaveError] = useState<string | null>(null);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      setLoadError(null);
      const [summaryData, userData, logData] = await Promise.all([
        getSystemSummary(),
        getAllUsers(),
        getSystemActivityLogs(),
      ]);
      setSummary(summaryData);
      setUsers(userData);
      setLogs(logData);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") {
      return users;
    }
    return users.filter((user) => user.roles.includes(roleFilter as User["roles"][number]));
  }, [roleFilter, users]);

  function handleUserCreated(created: User) {
    setUsers((prev) => [created, ...prev]);
  }

  async function handleSaveRoles(userId: number, roles: AssignableAdminRole[]) {
    setIsSavingRoles(true);
    setRoleSaveError(null);
    try {
      const response = await updateUserRoles(String(userId), roles);
      const updated = response.data as User;
      setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
      setEditingUser(null);
    } catch (error) {
      setRoleSaveError(getApiErrorMessage(error));
    } finally {
      setIsSavingRoles(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading superadmin dashboard..." />;
  }

  if (loadError) {
    return <ErrorAlert message={loadError} />;
  }

  return (
    <div className="page-grid">
      <section className="hero-panel hero-panel-wide">
        <p className="eyebrow">Superadmin console</p>
        <h1>Institutional account management</h1>
        <p>
          Create admin, staff, and IAEC accounts, review the user directory, and monitor
          system activity from one place.
        </p>
        <p>
          Signed in as <strong>{currentUser.email}</strong> ({currentUser.roles.join(", ")})
        </p>
      </section>

      <PageSection title="System Summary" subtitle="Overview of LMCPAFM">
        {summary ? (
          <div className="summary-grid">
            <div className="summary-card">
              <h4>Total Users</h4>
              <p>{summary.total_users}</p>
            </div>
            <div className="summary-card">
              <h4>Total Projects</h4>
              <p>{summary.total_projects}</p>
            </div>
            <div className="summary-card">
              <h4>Total Requisitions</h4>
              <p>{summary.total_requisitions}</p>
            </div>
            <div className="summary-card">
              <h4>Total Allocations</h4>
              <p>{summary.total_allocations}</p>
            </div>
            <div className="summary-card">
              <h4>Total Experiments</h4>
              <p>{summary.total_experiments}</p>
            </div>
          </div>
        ) : (
          <p>No summary available.</p>
        )}
      </PageSection>

      <PageSection
        title="Create User"
        subtitle="Admin, staff, and IAEC accounts — investigators self-register separately."
      >
        <CreateStaffUserForm onCreated={handleUserCreated} />
      </PageSection>

      <PageSection title="User Directory" subtitle="Manage roles for institutional accounts">
        <div className="user-directory-header">
          <label>
            Filter by role
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">All users</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="iaec">IAEC</option>
              <option value="investigator">Investigator</option>
            </select>
          </label>
          <button type="button" className="btn btn-secondary" onClick={() => void loadAll()}>
            Refresh
          </button>
        </div>

        <DataTable
          rows={filteredUsers}
          emptyText="No users match this filter."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Name", cell: (row) => row.name ?? "—" },
            { header: "Email", cell: (row) => row.email },
            { header: "Roles", cell: (row) => row.roles.join(", ") },
            { header: "Status", cell: (row) => (row.status ? "Active" : "Inactive") },
            {
              header: "Actions",
              cell: (row) =>
                userHasInvestigatorRole(row.roles) ? (
                  <span className="muted-text">Self-registered</span>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => {
                      setRoleSaveError(null);
                      setEditingUser(row);
                    }}
                  >
                    Edit Roles
                  </button>
                ),
            },
          ]}
        />
      </PageSection>

      <PageSection title="Activity Logs" subtitle="Recent administrative actions">
        <DataTable
          rows={logs}
          emptyText="No activity logs."
          columns={[
            { header: "Timestamp", cell: (row) => formatDisplayDate(row.timestamp) },
            { header: "User", cell: (row) => row.user_name },
            { header: "Action", cell: (row) => row.action },
            { header: "Details", cell: (row) => row.details },
          ]}
        />
      </PageSection>

      <PageSection title="Quick Navigation" subtitle="Operational tools">
        <div className="quick-nav-grid">
          <button type="button" className="btn" onClick={() => navigate("/iaec-dashboard")}>
            IAEC Dashboard
          </button>
          <button type="button" className="btn" onClick={() => navigate("/form-c")}>
            Form C Inventory
          </button>
          <button type="button" className="btn" onClick={() => navigate("/allocations")}>
            Allocations
          </button>
          <button type="button" className="btn" onClick={() => navigate("/requisitions")}>
            Requisitions
          </button>
        </div>
      </PageSection>

      {editingUser ? (
        <UserRoleEditForm
          user={editingUser}
          currentUserId={currentUser.id}
          isSaving={isSavingRoles}
          errorMessage={roleSaveError}
          onCancel={() => {
            setEditingUser(null);
            setRoleSaveError(null);
          }}
          onSave={handleSaveRoles}
        />
      ) : null}
    </div>
  );
}
