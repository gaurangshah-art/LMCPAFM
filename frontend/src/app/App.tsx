import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "../components/layout/Navbar";
import { DashboardPage } from "../pages/DashboardPage";
import { IAECProjectPage } from "../pages/IAECProjectPage";
import { RequisitionPage } from "../pages/RequisitionPage";
import { AllocationPage } from "../pages/AllocationPage";
import { ExperimentGroupPage } from "../pages/ExperimentGroupPage";
import { ExperimentPage } from "../pages/ExperimentPage";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/iaec-projects" element={<IAECProjectPage />} />
          <Route path="/requisitions" element={<RequisitionPage />} />
          <Route path="/allocations" element={<AllocationPage />} />
          <Route path="/experiment-groups" element={<ExperimentGroupPage />} />
          <Route path="/experiments" element={<ExperimentPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
