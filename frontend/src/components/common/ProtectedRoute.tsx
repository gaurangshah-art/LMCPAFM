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
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role restriction exists → enforce it
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
}
