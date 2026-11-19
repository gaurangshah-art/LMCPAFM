import { Navigate } from "react-router-dom";

/** User management lives on Admin Dashboard only (admin role). */
export function UsersPage() {
  return <Navigate to="/admin-dashboard" replace />;
}
