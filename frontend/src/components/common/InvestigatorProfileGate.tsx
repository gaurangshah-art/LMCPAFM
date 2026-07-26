import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyInvestigatorProfile } from "../../api/investigatorProfileApi";
import { LoadingState } from "./LoadingState";
import type { User } from "../../api/types";

interface InvestigatorProfileGateProps {
  currentUser: User | null;
  children: React.ReactNode;
}

export function InvestigatorProfileGate({ currentUser, children }: InvestigatorProfileGateProps) {
  const location = useLocation();
  const [checking, setChecking] = useState(
    Boolean(currentUser?.roles.includes("investigator")),
  );
  const [isComplete, setIsComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!currentUser?.roles.includes("investigator")) {
      setChecking(false);
      setIsComplete(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const profile = await getMyInvestigatorProfile();
        if (!cancelled) {
          setIsComplete(profile.is_complete);
        }
      } catch {
        if (!cancelled) {
          setIsComplete(false);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (!currentUser?.roles.includes("investigator")) {
    return <>{children}</>;
  }

  if (checking) {
    return <LoadingState label="Checking investigator profile..." />;
  }

  if (
    isComplete === false &&
    location.pathname !== "/investigator-profile"
  ) {
    return (
      <Navigate
        to="/investigator-profile?complete=1"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
