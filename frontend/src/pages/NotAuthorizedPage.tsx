import { Link } from "react-router-dom";

export function NotAuthorizedPage() {
  return (
    <div className="page not-authorized page-card">
      <h1>Not authorized</h1>
      <p>You do not have permission to open this page with your current role.</p>
      <p>
        <strong>Investigators</strong> use Dashboard, My Profile, and Form B — not Superadmin or
        Staff-only tools. <strong>Staff</strong> use Facility and allocations. Only{" "}
        <strong>admin</strong> manages users.
      </p>
      <p>
        <Link to="/">Go to Dashboard</Link>
        {" · "}
        <Link to="/investigator-profile">My Profile</Link>
      </p>
    </div>
  );
}
