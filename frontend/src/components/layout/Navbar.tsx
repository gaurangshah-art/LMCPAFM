import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/iaec-projects", label: "IAEC Project" },
  { to: "/requisitions", label: "Requisition" },
  { to: "/allocations", label: "Allocation" },
  { to: "/experiment-groups", label: "Experiment Group" },
  { to: "/experiments", label: "Experiment" },
];

export function Navbar() {
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
    </header>
  );
}
