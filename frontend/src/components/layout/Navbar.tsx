import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { User, UserRole } from "../../api/types";
import { COLLEGE_NAME, SYSTEM_TAGLINE } from "../../constants/branding";
import { CollegeLogo } from "../common/CollegeLogo";

type NavItem = {
  to: string;
  label: string;
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/users", label: "Users", roles: ["staff"] },
  { to: "/admin-dashboard", label: "Superadmin", roles: ["admin"] },
  { to: "/iaec-dashboard", label: "IAEC Dashboard", roles: ["iaec"] },
  { to: "/iaec-projects", label: "IAEC Projects", roles: ["iaec"] },
  { to: "/admin/masters", label: "Master Data", roles: ["admin"] },
  { to: "/form-b/step-1", label: "New Form B", roles: ["investigator"] },
  { to: "/investigator-profile", label: "My Profile", roles: ["investigator"] },
  { to: "/requisitions", label: "Requisitions", roles: ["investigator", "staff", "iaec"] },
  { to: "/allocations", label: "Allocations", roles: ["staff", "investigator", "iaec"] },
  { to: "/facility", label: "Facility", roles: ["staff", "admin"] },
  { to: "/admin/facility", label: "Facility Admin", roles: ["admin"] },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const items = currentUser ? visibleNavItems(currentUser) : [];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-menu-open", menuOpen);
    return () => document.body.classList.remove("nav-menu-open");
  }, [menuOpen]);

  return (
    <header className="top-nav">
      <div className="nav-primary">
        <div className="brand">
          <CollegeLogo size="sm" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-mark">{COLLEGE_NAME}</span>
            <small>{SYSTEM_TAGLINE}</small>
          </div>
        </div>

        {currentUser ? (
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
          </button>
        ) : null}
      </div>

      {currentUser ? (
        <nav
          id="primary-navigation"
          className={`nav-links ${menuOpen ? "is-open" : ""}`}
          aria-label="Primary"
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              onClick={() => setMenuOpen(false)}
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
