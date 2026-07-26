import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";

import type { FinalReport, FinalReportGroup } from "../../api/types";

export function FinalReportViewPage() {
  const { allocationId } = useParams();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [groups, setGroups] = useState<FinalReportGroup[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load group structure
        const entryRes = await api.get(`/experiment/entry/${allocationId}`);
        setGroups(entryRes.data.groups);

        // Load final report
        const reportRes = await api.get(`/final-report/${allocationId}`);
        setReport(reportRes.data);
      } catch {
        alert("Failed to load final report.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [allocationId]);

  if (loading) {
    return (
      <div className="page-card">
        <p>Loading final report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="page-card">
        <p>No final report submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Final Report (View)</h2>
        <p>Allocation ID: {allocationId}</p>
      </header>

      <section className="dashboard-section">
        <h3>Overall Summary</h3>
        <p>{report.summary}</p>
      </section>

      <hr />

      <section className="dashboard-section">
        <h3>Group-wise Results</h3>
        {groups.map((g) => (
          <div key={g.id} className="dashboard-card">
            <p><strong>{g.name}</strong></p>
            <p>{report.group_results?.[g.id] ?? "No data"}</p>
          </div>
        ))}
      </section>

      <hr />

      <section className="dashboard-section">
        <h3>Mortality Summary</h3>
        <p>{report.mortality_summary || "No data"}</p>
      </section>

      <section className="dashboard-section">
        <h3>Endpoint Summary</h3>
        <p>{report.endpoint_summary || "No data"}</p>
      </section>

      <section className="dashboard-section">
        <h3>Adverse Events</h3>
        <p>{report.adverse_events || "No data"}</p>
      </section>

      <section className="dashboard-section">
        <h3>Conclusion</h3>
        <p>{report.conclusion}</p>
      </section>
    </div>
  );
}
