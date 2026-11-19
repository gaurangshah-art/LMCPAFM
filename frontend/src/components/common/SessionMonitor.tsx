import { useCallback, useEffect, useState } from "react";
import { refreshSession } from "../../api/authApi";
import { getAccessToken, setAccessToken } from "../../api/client";
import { getApiErrorMessage } from "../../api/errors";
import {
  clearStoredSession,
  getStoredAccessToken,
  setStoredAccessToken,
  stashReturnToPath,
} from "../../auth/session";
import type { User } from "../../api/types";
import { getSecondsUntilExpiry, isTokenExpired, isTokenExpiringSoon } from "../../utils/jwt";

const CHECK_INTERVAL_MS = 30_000;
const WARNING_THRESHOLD_SECONDS = 300;

interface SessionMonitorProps {
  currentUser: User | null;
}

export function SessionMonitor({ currentUser }: SessionMonitorProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    stashReturnToPath(returnTo);
    clearStoredSession();
    setAccessToken(null);

    if (!window.location.pathname.startsWith("/login")) {
      const params = new URLSearchParams({ expired: "1" });
      if (returnTo && !returnTo.startsWith("/login")) {
        params.set("returnTo", returnTo);
      }
      window.location.replace(`/login?${params.toString()}`);
    }
  }, []);

  const evaluateSession = useCallback(async () => {
    const token = getAccessToken() ?? getStoredAccessToken();
    if (!token || !currentUser) {
      setShowWarning(false);
      return;
    }

    if (isTokenExpired(token)) {
      redirectToLogin();
      return;
    }

    const secondsLeft = getSecondsUntilExpiry(token);
    if (isTokenExpiringSoon(token, WARNING_THRESHOLD_SECONDS)) {
      setMinutesLeft(Math.max(1, Math.ceil(secondsLeft / 60)));
      setShowWarning(true);
      return;
    }

    setShowWarning(false);
    setRefreshError(null);
  }, [currentUser, redirectToLogin]);

  useEffect(() => {
    if (!currentUser) {
      setShowWarning(false);
      return;
    }

    void evaluateSession();
    const timer = window.setInterval(() => {
      void evaluateSession();
    }, CHECK_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void evaluateSession();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser, evaluateSession]);

  async function handleStaySignedIn() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const token = await refreshSession();
      setStoredAccessToken(token.access_token);
      setAccessToken(token.access_token);
      setShowWarning(false);
    } catch (error) {
      setRefreshError(getApiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }

  if (!currentUser || !showWarning) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="session-warning-title">
        <div className="modal-header">
          <h3 id="session-warning-title">Session expiring soon</h3>
          <p>
            Your sign-in expires in about {minutesLeft} minute{minutesLeft === 1 ? "" : "s"}. Save
            your work, then choose <strong>Stay signed in</strong> to continue without losing this
            page.
          </p>
        </div>
        <div className="modal-body">
          <p className="muted-text">
            Tip: use <strong>Save and continue</strong> or <strong>Save &amp; Next</strong> on Form B
            steps so your draft is stored on the server.
          </p>
          {refreshError ? <p className="error-text">{refreshError}</p> : null}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => void handleStaySignedIn()} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Stay signed in"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowWarning(false)}>
            Continue working
          </button>
        </div>
      </div>
    </div>
  );
}
