import { Navigate } from "react-router-dom";
import { defaultHomeForUser } from "../../app/roles";
import type { User } from "../../api/types";

export function RedirectToRoleHome({ user }: { user: User }) {
  return <Navigate to={defaultHomeForUser(user)} replace />;
}
