import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getAllUsers,
  updateUserRoles,
  getSystemActivityLogs,
  getSystemSummary,
} from "../api/adminApi";

import type { User, SystemSummary, ActivityLog } from "../api/types";

import { PageSection } from "../components/common/PageSection";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { DataTable } from "../components/tables/DataTable";
import { formatDisplayDate } from "../utils/dateFormat";

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);

      const sys = await getSystemSummary();
      setSummary(sys.data);

      const usr = await getAllUsers();
      setUsers(usr.data);

      const lg = await getSystemActivityLogs();
      setLogs(lg.data);

    } catch {
      setError("Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sys = await getSystemSummary();
        if (cancelled) return;
        setSummary(sys.data);

        const usr = await getAllUsers();
        if (cancelled) return;
        setUsers(usr.data);

        const lg = await getSystemActivityLogs();
        if (cancelled) return;
        setLogs(lg.data);
      } catch {
        if (!cancelled) {
          setError("Failed to load admin dashboard.");
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
  }, []);

  async function handleRoleUpdate(userId: number) {
    const newRole = prompt("Enter new role (admin, staff, iaec, investigator):");
    if (!newRole) return;

    try {
      await updateUserRoles(String(userId), [newRole]);
      void loadAll();
      alert("Role updated.");
    } catch {
      alert("Failed to update role.");
    }
  }

  if (loading) return <LoadingState label="Loading admin dashboard..." />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div className="page-grid">
      {/* SYSTEM SUMMARY */}
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

      {/* USER MANAGEMENT */}
      <PageSection title="User Management" subtitle="Users and roles">
        <DataTable
          rows={users}
          emptyText="No users found."
          columns={[
            { header: "ID", cell: (row) => row.id },
            { header: "Name", cell: (row) => row.name },
            { header: "Email", cell: (row) => row.email },
            { header: "Roles", cell: (row) => row.roles.join(", ") },
            {
              header: "Actions",
              cell: (row) => (
                <button
                  className="btn-small"
                  onClick={() => handleRoleUpdate(row.id)}
                >
                  Update Role
                </button>
              ),
            },
          ]}
        />
      </PageSection>

      {/* ACTIVITY LOGS */}
      <PageSection title="Activity Logs" subtitle="System-wide actions">
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

      {/* QUICK NAVIGATION */}
      <PageSection title="Quick Navigation" subtitle="Admin tools">
        <div className="quick-nav-grid">
          <button className="btn" onClick={() => navigate("/users")}>
            Manage Users
          </button>
          <button className="btn" onClick={() => navigate("/iaec-dashboard")}>
            IAEC Dashboard
          </button>
          <button className="btn" onClick={() => navigate("/allocations")}>
            Allocations
          </button>
          <button className="btn" onClick={() => navigate("/requisitions")}>
            Requisitions
          </button>
        </div>
      </PageSection>
    </div>
  );
}
