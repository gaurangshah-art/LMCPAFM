import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { User, UserRole } from "../../api/types";

type NavItem = {
  to: string;
  label: string;
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/users", label: "Users", roles: ["staff", "admin"] },
  { to: "/admin-dashboard", label: "Admin", roles: ["admin"] },
  { to: "/iaec-dashboard", label: "IAEC Dashboard", roles: ["iaec"] },
  { to: "/iaec-projects", label: "IAEC Projects", roles: ["iaec"] },
  { to: "/form-b/step-1", label: "New Form B", roles: ["investigator"] },
  { to: "/investigator-profile", label: "My Profile", roles: ["investigator"] },
  { to: "/investigator-dashboard", label: "My Dashboard", roles: ["investigator"] },
  { to: "/requisitions", label: "Requisitions", roles: ["investigator", "staff", "iaec"] },
  { to: "/allocations", label: "Allocations", roles: ["staff", "investigator", "iaec"] },
  { to: "/form-c", label: "Form C", roles: ["staff", "iaec", "admin"] },
  { to: "/experiment-groups", label: "Experiment Groups", roles: ["investigator"] },
  { to: "/experiments", label: "Experiments", roles: ["investigator"] },
];

function visibleNavItems(currentUser: User): NavItem[] {
  return navItems.filter((item) => {
    if (!item.roles?.length) {
      return true;
    }
    return item.roles.some((role) => currentUser.roles.includes(role));
  });
}

interface NavbarProps {
  currentUser: User | null;
  isAuthLoading: boolean;
  onLogout: () => void;
  children?: ReactNode;
}

export function Navbar({ currentUser, isAuthLoading, onLogout, children }: NavbarProps) {
  const items = currentUser ? visibleNavItems(currentUser) : [];

  return (
    <header className="top-nav">
      <div className="brand">
        <span className="brand-mark">LMCPAFM</span>
        <small>Animal Facility Workflow</small>
      </div>

      {currentUser ? (
        <nav className="nav-links" aria-label="Primary">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
          {children}
        </nav>
      ) : null}

      <div className="session-panel">
        {currentUser ? (
          <>
            <div className="session-meta">
              <strong>{currentUser.name ?? currentUser.email}</strong>
              <div className="role-badges">
                {currentUser.roles.map((role) => (
                  <span key={role} className="role-badge">
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <button type="button" className="btn session-btn" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : isAuthLoading ? (
          <span className="session-loading">Restoring session...</span>
        ) : (
          <NavLink to="/login" className="nav-link nav-link-cta">
            Log in
          </NavLink>
        )}
      </div>
    </header>
  );
}
