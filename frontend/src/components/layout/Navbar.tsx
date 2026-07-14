import { NavLink } from "react-router-dom";
import type { AppRole } from "../../app/roles";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/iaec-projects", label: "IAEC Project" },
  { to: "/requisitions", label: "Requisition" },
  { to: "/allocations", label: "Allocation" },
  { to: "/experiment-groups", label: "Experiment Group" },
  { to: "/experiments", label: "Experiment" },
];

interface NavbarProps {
  role: AppRole;
  onRoleChange: (role: AppRole) => void;
}

export function Navbar({ role, onRoleChange }: NavbarProps) {
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
      <div className="role-switch">
        <label htmlFor="app-role">Role</label>
        <select
          id="app-role"
          value={role}
          onChange={(event) => onRoleChange(event.target.value as AppRole)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
    </header>
  );
}
