import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { Navbar } from "../components/layout/Navbar";
import { DashboardPage } from "../pages/DashboardPage";
import { IAECProjectPage } from "../pages/IAECProjectPage";
import { RequisitionPage } from "../pages/RequisitionPage";
import { AllocationPage } from "../pages/AllocationPage";
import { ExperimentGroupPage } from "../pages/ExperimentGroupPage";
import { ExperimentPage } from "../pages/ExperimentPage";
import type { AppRole } from "./roles";

export default function App() {
  const [role, setRole] = useState<AppRole>("user");

  return (
    <div className="app-shell">
      <Navbar role={role} onRoleChange={setRole} />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/iaec-projects" element={<IAECProjectPage />} />
          <Route path="/requisitions" element={<RequisitionPage role={role} />} />
          <Route path="/allocations" element={<AllocationPage role={role} />} />
          <Route path="/experiment-groups" element={<ExperimentGroupPage />} />
          <Route path="/experiments" element={<ExperimentPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
