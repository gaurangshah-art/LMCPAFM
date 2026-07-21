import { NavLink } from "react-router-dom";
import type { User } from "../../api/types";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/users", label: "Users" },
  { to: "/iaec-projects", label: "IAEC Project" },
  { to: "/requisitions", label: "Requisition" },
  { to: "/allocations", label: "Allocation" },
  { to: "/experiment-groups", label: "Experiment Group" },
  { to: "/experiments", label: "Experiment" },
];

interface NavbarProps {
  currentUser: User | null;
  isAuthLoading: boolean;
  onLogout: () => void;
}

export function Navbar({ currentUser, isAuthLoading, onLogout }: NavbarProps) {
  return (
    <header className="top-nav">
      <div className="brand">
        <span className="brand-mark">LMCPAFM</span>
        <small>Animal Facility Workflow</small>
      </div>
      <nav className="nav-links" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="session-panel">
        <div className="session-meta">
          <strong>{currentUser?.name ?? currentUser?.email ?? (isAuthLoading ? "Restoring session..." : "Guest")}</strong>
          <div className="role-badges">
            {currentUser?.roles.length ? currentUser.roles.map((role) => (
              <span key={role} className="role-badge">{role}</span>
            )) : <span className="role-badge muted">no role</span>}
          </div>
        </div>
        {currentUser ? (
          <button type="button" className="btn session-btn" onClick={onLogout}>
            Log out
          </button>
        ) : (
          <NavLink to="/login" className="nav-link nav-link-cta">
            Log in
          </NavLink>
        )}
      </div>
    </header>
  );
}
