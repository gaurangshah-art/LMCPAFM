import { Navigate, Route, Routes } from "react-router-dom";
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
import { RegisterInvestigatorPage } from "../pages/RegisterInvestigatorPage";
import { UsersPage } from "../pages/UsersPage";
import { NotAuthorizedPage } from "../pages/NotAuthorizedPage";
import { IaecDashboard } from "../pages/iaec/IaecDashboard";
import { InvestigatorDashboardPage } from "../pages/InvestigatorDashboardPage";
import { RequisitionViewPage } from "../pages/RequisitionViewPage";
import { AllocationViewPage } from "../pages/AllocationViewPage";
import { InvestigatorProfilePage } from "../pages/InvestigatorProfilePage";
import { InvestigatorProfileGate } from "../components/common/InvestigatorProfileGate";
import { getMyInvestigatorProfile } from "../api/investigatorProfileApi";
import { FormBStep1 } from "../pages/formB/FormBStep1";
import { FormBStep2 } from "../pages/formB/FormBStep2";
import { FormBStep3 } from "../pages/formB/FormBStep3";
import { FormBStep4 } from "../pages/formB/FormBStep4";
import { FormBStep5 } from "../pages/formB/FormBStep5";
import { FormBStep6 } from "../pages/formB/FormBStep6";
import { FormBStep7 } from "../pages/formB/FormBStep7";
import { FormBReview } from "../pages/formB/FormBReview";
import { IaecCreateMeeting } from "../pages/iaec/IaecCreateMeeting";
import { IaecMeetingDetails } from "../pages/iaec/IaecMeetingDetails";
import { IaecProjectReview } from "../pages/iaec/IaecProjectReview";
import { IaecApprovalCertificate } from "../pages/iaec/IaecApprovalCertificate";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { FormCPage } from "../pages/FormCPage";


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
      let redirectPath = primaryRole ? (roleHome[primaryRole] ?? "/") : "/";

      if (user.roles.includes("investigator")) {
        try {
          const profile = await getMyInvestigatorProfile();
          if (!profile.is_complete) {
            redirectPath = "/investigator-profile?complete=1";
          }
        } catch {
          redirectPath = "/investigator-profile?complete=1";
        }
      }

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
      />

      <main className="page-container">
        <InvestigatorProfileGate currentUser={currentUser}>
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

          <Route
            path="/register-investigator"
            element={
              getAccessToken() && currentUser ? (
                <Navigate to="/" replace />
              ) : (
                <RegisterInvestigatorPage />
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

          <Route
            path="/iaec-dashboard"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["iaec"]}
              >
                <IaecDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/iaec/meetings/new"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["iaec"]}
              >
                <IaecCreateMeeting />
              </ProtectedRoute>
            }
          />

          <Route
            path="/iaec/meetings/:meetingId"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["iaec"]}
              >
                <IaecMeetingDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/iaec/project/:projectId/review"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["iaec"]}
              >
                <IaecProjectReview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/iaec/project/:projectId/certificate"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["iaec", "investigator"]}
              >
                <IaecApprovalCertificate />
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
              path="/form-b/step-1"
              element={
                <ProtectedRoute
                  currentUser={currentUser}
                  isAuthLoading={isAuthLoading}
                  allowedRoles={["investigator"]}
                >
                  <FormBStep1 />
                </ProtectedRoute>
              }
            />

            <Route
              path="/form-b/step-2"
              element={
                <ProtectedRoute
                  currentUser={currentUser}
                  isAuthLoading={isAuthLoading}
                  allowedRoles={["investigator"]}
                >
                  <FormBStep2 />
                </ProtectedRoute>
              }
            />

            <Route
              path="/form-b/step-3"
              element={
                <ProtectedRoute
                  currentUser={currentUser}
                  isAuthLoading={isAuthLoading}
                  allowedRoles={["investigator"]}
                >
                  <FormBStep3 />
                </ProtectedRoute>
              }
            />

            <Route
              path="/form-b/step-4"
              element={
                <ProtectedRoute
                  currentUser={currentUser}
                  isAuthLoading={isAuthLoading}
                  allowedRoles={["investigator"]}
                >
                  <FormBStep4 />
                </ProtectedRoute>
              }
            />

            <Route
              path="/form-b/step-5"
              element={
                <ProtectedRoute
                  currentUser={currentUser}
                  isAuthLoading={isAuthLoading}
                  allowedRoles={["investigator"]}
                >
                  <FormBStep5 />
                </ProtectedRoute>
              }
            />

            <Route
              path="/form-b/step-6"
              element={
                <ProtectedRoute
                  currentUser={currentUser}
                  isAuthLoading={isAuthLoading}
                  allowedRoles={["investigator"]}
                >
                  <FormBStep6 />
                </ProtectedRoute>
              }
            />

            <Route
              path="/form-b/step-7"
              element={
                <ProtectedRoute
                  currentUser={currentUser}
                  isAuthLoading={isAuthLoading}
                  allowedRoles={["investigator"]}
                >
                  <FormBStep7 />
                </ProtectedRoute>
              }
            />

            <Route
              path="/form-b/review"
              element={
                <ProtectedRoute
                  currentUser={currentUser}
                  isAuthLoading={isAuthLoading}
                  allowedRoles={["investigator"]}
                >
                  <FormBReview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/investigator-profile"
              element={
                <ProtectedRoute
                  currentUser={currentUser}
                  isAuthLoading={isAuthLoading}
                  allowedRoles={["investigator"]}
                >
                  <InvestigatorProfilePage />
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
  
          <Route
            path="/form-c"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                isAuthLoading={isAuthLoading}
                allowedRoles={["staff", "iaec", "admin"]}
              >
                <FormCPage />
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
        </InvestigatorProfileGate>
      </main>
    </div>
  );
}
