import { Navigate, useLocation } from "react-router-dom";
import type { User } from "../../api/types";

interface MustChangePasswordGateProps {
  currentUser: User | null;
  children: React.ReactNode;
}

export function MustChangePasswordGate({ currentUser, children }: MustChangePasswordGateProps) {
  const location = useLocation();

  if (!currentUser?.must_change_password) {
    return <>{children}</>;
  }

  if (location.pathname === "/account/password") {
    return <>{children}</>;
  }

  return (
    <Navigate
      to="/account/password?required=1"
      replace
      state={{ from: location.pathname }}
    />
  );
}
