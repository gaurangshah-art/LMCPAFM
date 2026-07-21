import type { User } from "../../api/types";

interface DashboardPageProps {
  currentUser: User | null;
}

export function DashboardPage({ currentUser }: DashboardPageProps) {
  return (
    <div className="page-grid dashboard-grid">
      <section className="hero-panel hero-panel-wide">
        <p className="eyebrow">LMCPAFM workflow console</p>
        <h1>Operational frontend for authenticated facility workflows</h1>
        <p>
          Use the app to manage users, sign into protected IAEC flows, and move approved
          work from protocols through requisitions, allocations, and experiments.
        </p>
      </section>

      <section className="page-card stat-panel">
        <header className="section-header">
          <h2>Current Session</h2>
          <p>Resolved from the backend auth token.</p>
        </header>
        <div className="info-grid">
          <article>
            <h3>Identity</h3>
            <p>{currentUser?.name ?? currentUser?.email ?? "Not logged in"}</p>
          </article>
          <article>
            <h3>Roles</h3>
            <p>{currentUser?.roles.join(", ") || "Log in to access requisition and allocation workflows."}</p>
          </article>
          <article>
            <h3>Backend Base URL</h3>
            <p>http://127.0.0.1:8000</p>
          </article>
          <article>
            <h3>Workflow</h3>
            <p>Project {">"} Group {">"} Requisition {">"} Allocation {">"} Experiment</p>
          </article>
        </div>
      </section>
    </div>
  );
}
