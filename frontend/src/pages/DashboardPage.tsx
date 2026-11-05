import { Navigate } from "react-router-dom";
import type { User } from "../api/types";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { InvestigatorDashboardPage } from "./InvestigatorDashboardPage";

interface DashboardPageProps {
  currentUser: User | null;
}

export function DashboardPage({ currentUser }: DashboardPageProps) {
  if (!currentUser) {
    return (
      <div className="page-card">
        <p>Log in to view your dashboard.</p>
      </div>
    );
  }

  if (currentUser.roles.includes("admin")) {
    return <AdminDashboardPage currentUser={currentUser} />;
  }

  if (currentUser.roles.includes("investigator")) {
    return <InvestigatorDashboardPage currentUser={currentUser} />;
  }

  if (currentUser.roles.includes("iaec")) {
    return <Navigate to="/iaec-dashboard" replace />;
  }

  if (currentUser.roles.includes("staff")) {
    return <Navigate to="/allocations" replace />;
  }

  return (
    <div className="page-grid dashboard-grid">
      <section className="hero-panel hero-panel-wide">
        <p className="eyebrow">LMCPAFM workflow console</p>
        <h1>Welcome, {currentUser.name}</h1>
        <p>Use the navigation menu to open the tools available for your role.</p>
      </section>
    </div>
  );
}
