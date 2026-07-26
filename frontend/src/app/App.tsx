import { Navigate, Route, Routes, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../api/authApi";
import { getAccessToken, setAccessToken } from "../api/client";
import {
  clearStoredSession,
  getStoredAccessToken,
  hasStoredAccessToken,
  setStoredAccessToken,
} from "../auth/session";
import type { User } from "../api/types";

import { Navbar } from "../components/layout/Navbar";
import { ProtectedRoute } from "../components/common/ProtectedRoute";

import { DashboardPage } from "../pages/DashboardPage";
import { IAECProjectPage } from "../pages/IAECProjectPage";
import { RequisitionPage } from "../pages/RequisitionPage";
import { AllocationPage } from "../pages/AllocationPage";
import { ExperimentGroupPage } from "../pages/ExperimentGroupPage";
import { ExperimentPage } from "../pages/ExperimentPage";
import { LoginPage } from "../pages/LoginPage";
import { UsersPage } from "../pages/UsersPage";
import { NotAuthorizedPage } from "../pages/NotAuthorizedPage";
import { IAECWorkflowDashboardPage } from "../pages/IAECWorkflowDashboardPage";
import { InvestigatorDashboardPage } from "../pages/InvestigatorDashboardPage";
import { RequisitionViewPage } from "../pages/RequisitionViewPage";
import { AllocationViewPage } from "../pages/AllocationViewPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";


const roleHome: Record<string, string> = {
  iaec: "/iaec-projects",
  staff: "/allocations",
  investigator: "/requisitions",
  admin: "/users",
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(hasStoredAccessToken);

  useEffect(() => {
    const storedAccessToken = getStoredAccessToken();

    if (!storedAccessToken) {
      setIsAuthLoading(false);
      return;
    }

    setAccessToken(storedAccessToken);

    let cancelled = false;

    (async () => {
      try {
        const user = await getCurrentUser();
        if (!cancelled) {
          setCurrentUser(user);
        }
      } catch {
        if (!cancelled) {
          clearStoredSession();
          setAccessToken(null);
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsAuthLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAuthenticated(accessToken: string) {
    setStoredAccessToken(accessToken);
    setAccessToken(accessToken);
    setIsAuthLoading(true);

    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      const primaryRole = user.roles[0];
      const redirectPath = primaryRole ? (roleHome[primaryRole] ?? "/") : "/";
      window.location.replace(redirectPath);
    } catch {
      clearStoredSession();
      setAccessToken(null);
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }

  function handleLogout() {
    clearStoredSession();
    setAccessToken(null);
    setCurrentUser(null);
    setIsAuthLoading(false);
  }

  return (
    <div className="app-shell">
      <Navbar
        currentUser={currentUser}
        isAuthLoading={isAuthLoading}
        onLogout={handleLogout}
      >
        {currentUser?.roles.includes("iaec") && (
          <>
            <NavLink to="/iaec-dashboard">IAEC Dashboard</NavLink>
            <NavLink to="/iaec-projects">IAEC Projects</NavLink>
          </>
        )}
            {currentUser?.roles.includes("investigator") && (
  <>
            <NavLink to="/investigator-dashboard">My Dashboard</NavLink>
            <NavLink to="/requisitions">Requisitions</NavLink>
            <NavLink to="/experiment-groups">Experiment Groups</NavLink>
            <NavLink to="/experiments">Experiments</NavLink>
        </>
    )}
      </Navbar>

      <main className="page-container">
        <Routes>
          {/* LOGIN */}
          <Route
            path="/login"
            element={
              getAccessToken() && currentUser ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage onAuthenticated={handleAuthenticated} />
              )
            }
          />

          {/* DASHBOARD */}
          <Route
            path="/"
            element={
              <ProtectedRoute currentUser={currentUser} isAuthLoading={isAuthLoading}>
                <DashboardPage currentUser={currentUser} />
              </ProtectedRoute>
            }
          />

          {/* USERS — staff + admin */}
          <Route
            path="/users"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["staff", "admin"]}
              >
                <UsersPage currentUser={currentUser} />
              </ProtectedRoute>
            }
          />

          {/* IAEC PROJECTS */}
          <Route
            path="/iaec-projects"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["iaec"]}
              >
                <IAECProjectPage />
              </ProtectedRoute>
            }
          />

          {/* IAEC WORKFLOW DASHBOARD */}
          <Route
            path="/iaec-dashboard"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["iaec"]}
              >
                <IAECWorkflowDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* REQUISITIONS — investigator */}
          <Route
            path="/requisitions"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["investigator"]}
              >
                <RequisitionPage currentUser={currentUser} />
              </ProtectedRoute>
            }
          />
            <Route
  path="/investigator-dashboard"
  element={
    <ProtectedRoute
      currentUser={currentUser}
      isAuthLoading={isAuthLoading}
      allowedRoles={["investigator"]}
    >
      <InvestigatorDashboardPage currentUser={currentUser} />
    </ProtectedRoute>
  }
/>
  
          {/* ALLOCATIONS — staff */}
          <Route
            path="/allocations"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["staff"]}
              >
                <AllocationPage currentUser={currentUser} />
              </ProtectedRoute>
            }
          />

          {/* EXPERIMENT GROUPS — investigator */}
          <Route
            path="/experiment-groups"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["investigator"]}
              >
                <ExperimentGroupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requisitions/:id"
            element={
            <ProtectedRoute
            currentUser={currentUser}
            isAuthLoading={isAuthLoading}
            allowedRoles={["investigator", "staff", "iaec"]}
          >
          <RequisitionViewPage />
          </ProtectedRoute>
            }
          />
          <Route
            path="/allocations/:id"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["staff", "investigator", "iaec"]}
              >
                <AllocationViewPage />
              </ProtectedRoute>
            }
              />

              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute
                    currentUser={currentUser}
                    isAuthLoading={isAuthLoading}
                    allowedRoles={["admin"]}
                  >
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

                {/* ADMIN DASHBOARD */}
                <Route
                  path="/admin-dashboard"
                  element={
                    <ProtectedRoute
                      currentUser={currentUser}
                      isAuthLoading={isAuthLoading}
                      allowedRoles={["admin"]}
                    >
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />  
                  {/* EXPERIMENTS — investigator */}
                  <Route
                    path="/experiments"
                    element={
                      <ProtectedRoute
                        currentUser={currentUser}
                        isAuthLoading={isAuthLoading}
                        allowedRoles={["investigator"]}
                      >
                        <ExperimentPage />
                      </ProtectedRoute>
                    }
                  />

          {/* NOT AUTHORIZED */}
          <Route path="/not-authorized" element={<NotAuthorizedPage />} />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
