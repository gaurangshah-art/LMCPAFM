import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

import type { FinalReportGroup } from "../../api/types";

export function FinalReportEntryPage() {
  const { allocationId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<FinalReportGroup[]>([]);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);

  const [summary, setSummary] = useState("");
  const [groupResults, setGroupResults] = useState({});
  const [mortalitySummary, setMortalitySummary] = useState("");
  const [endpointSummary, setEndpointSummary] = useState("");
  const [adverseEvents, setAdverseEvents] = useState("");
  const [conclusion, setConclusion] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const entryRes = await api.get(`/experiment/entry/${allocationId}`);
        setGroups(entryRes.data.groups);

        const logsRes = await api.get(`/experiment/logs/${allocationId}`);
        setLogs(logsRes.data);
      } catch {
        alert("Failed to load final report data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [allocationId]);

  function updateGroupResult(groupId, value) {
    setGroupResults((prev) => ({
      ...prev,
      [groupId]: value,
    }));
  }

  async function submitReport() {
    if (!summary.trim()) return alert("Summary is required.");
    if (!conclusion.trim()) return alert("Conclusion is required.");

    try {
      await api.post("/final-report", {
        allocation_id: Number(allocationId),
        summary,
        group_results: groupResults,
        mortality_summary: mortalitySummary,
        endpoint_summary: endpointSummary,
        adverse_events: adverseEvents,
        conclusion,
      });

      alert("Final report submitted.");
      navigate(`/final/view/${allocationId}`);
    } catch {
      alert("Failed to submit final report.");
    }
  }

  if (loading) return <p>Loading final report...</p>;

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Final Report</h2>
        <p>Allocation ID: {allocationId}</p>
      </header>

      <section className="dashboard-section">
        <h3>Overall Summary</h3>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Summarize the entire experiment..."
        />
      </section>

      <hr />

      <section className="dashboard-section">
        <h3>Group-wise Results</h3>
        {groups.map((g) => (
          <div key={g.id} className="dashboard-card">
            <p><strong>{g.name}</strong></p>
            <textarea
              value={groupResults[g.id] || ""}
              onChange={(e) => updateGroupResult(g.id, e.target.value)}
              placeholder={`Results for ${g.name}...`}
            />
          </div>
        ))}
      </section>

      <hr />

      <section className="dashboard-section">
        <h3>Mortality Summary</h3>
        <textarea
          value={mortalitySummary}
          onChange={(e) => setMortalitySummary(e.target.value)}
          placeholder="Summarize mortality across groups..."
        />
      </section>

      <section className="dashboard-section">
        <h3>Endpoint Summary</h3>
        <textarea
          value={endpointSummary}
          onChange={(e) => setEndpointSummary(e.target.value)}
          placeholder="Describe humane endpoints reached..."
        />
      </section>

      <section className="dashboard-section">
        <h3>Adverse Events</h3>
        <textarea
          value={adverseEvents}
          onChange={(e) => setAdverseEvents(e.target.value)}
          placeholder="Describe any adverse events..."
        />
      </section>

      <section className="dashboard-section">
        <h3>Conclusion</h3>
        <textarea
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          placeholder="Final conclusion of the study..."
        />
      </section>

      <div className="wizard-actions">
        <button className="btn" onClick={submitReport}>
          Submit Final Report →
        </button>
      </div>
    </div>
  );
}
