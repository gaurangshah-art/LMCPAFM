import { Navigate, useLocation } from "react-router-dom";
import type { User } from "../../api/types";

interface ProtectedRouteProps {
  currentUser: User | null;
  isAuthLoading: boolean;
  allowedRoles?: string[];
  children: React.ReactNode;
}

export function ProtectedRoute({
  currentUser,
  isAuthLoading,
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();

  // Still loading user → don't redirect yet
  if (isAuthLoading) {
    return <p>Loading...</p>;
  }

  // Not logged in → redirect to login
  if (!currentUser) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  // Role restriction exists → enforce it
  if (allowedRoles && !currentUser.roles.some((role) => allowedRoles.includes(role))) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
}
