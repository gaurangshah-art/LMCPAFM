import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";

export function ExperimentLogsViewPage() {
  const { allocationId } = useParams();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [allocation, setAllocation] = useState<any>(null);

  async function loadData() {
    setLoading(true);
    try {
      const entryRes = await api.get(`/experiment/entry/${allocationId}`);
      setAllocation(entryRes.data.allocation);

      const logsRes = await api.get(`/experiment/logs/${allocationId}`);
      setLogs(logsRes.data || []);
    } catch {
      alert("Failed to load experiment logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [allocationId]);

  if (loading) {
    return (
      <div className="page-card">
        <p>Loading experiment logs...</p>
      </div>
    );
  }

  if (!allocation) {
    return (
      <div className="page-card">
        <p>No experiment data found.</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Experiment Logs (View)</h2>
        <p>LMCP/IAEC ID: {allocation.lmcp_iaec_id}</p>
        <p>Project: {allocation.project_title}</p>
      </header>

      <section className="dashboard-section">
        <h3>Allocated Animals</h3>
        <p><strong>Species:</strong> {allocation.species}</p>
        <p><strong>Strain:</strong> {allocation.strain}</p>
        <p><strong>Sex:</strong> {allocation.sex}</p>
        <p><strong>Age:</strong> {allocation.age}</p>
        <p><strong>Allocated:</strong> {allocation.quantity_allocated}</p>
      </section>

      <hr />

      <section className="dashboard-section">
        <h3>All Log Entries</h3>

        {logs.length === 0 && <p>No logs recorded.</p>}

        {logs.map((log) => (
          <div key={log.id} className="dashboard-card">
            <p><strong>Date:</strong> {log.date}</p>
            <p><strong>Group:</strong> {log.group_name}</p>
            {log.procedure_name && (
              <p><strong>Procedure:</strong> {log.procedure_name}</p>
            )}
            <p><strong>Observations:</strong> {log.observations}</p>
            {log.morbidity && (
              <p><strong>Morbidity:</strong> {log.morbidity}</p>
            )}
            {log.mortality && (
              <p><strong>Mortality:</strong> {log.mortality}</p>
            )}
            {log.endpoint && (
              <p><strong>Endpoint:</strong> {log.endpoint}</p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
