import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatDisplayDate } from "../../utils/dateFormat";

type Group = {
  id: number;
  name: string;
};

type Procedure = {
  id: number;
  name: string;
};

export function ExperimentLogsEntryPage() {
  const { allocationId } = useParams();
  const [loading, setLoading] = useState(true);
  const parsedAllocationId = Number(allocationId);
  const [prevAllocationId, setPrevAllocationId] = useState(parsedAllocationId);

  if (prevAllocationId !== parsedAllocationId) {
    setPrevAllocationId(parsedAllocationId);
    setLoading(true);
  }

  const [groups, setGroups] = useState<Group[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [observations, setObservations] = useState<string>("");
  const [morbidity, setMorbidity] = useState<string>("");
  const [mortality, setMortality] = useState<string>("");
  const [endpoint, setEndpoint] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const entryRes = await api.get(`/experiment/entry/${allocationId}`);
      setGroups(entryRes.data.groups || []);
      setProcedures(entryRes.data.procedures || []);

      const logsRes = await api.get(`/experiment/logs/${allocationId}`);
      setLogs(logsRes.data || []);
    } catch {
      alert("Failed to load experiment logs.");
    } finally {
      setLoading(false);
    }
  }, [allocationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const entryRes = await api.get(`/experiment/entry/${allocationId}`);
        if (cancelled) return;
        setGroups(entryRes.data.groups || []);
        setProcedures(entryRes.data.procedures || []);

        const logsRes = await api.get(`/experiment/logs/${allocationId}`);
        if (cancelled) return;
        setLogs(logsRes.data || []);
      } catch {
        if (!cancelled) {
          alert("Failed to load experiment logs.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allocationId]);

  function validate() {
    if (!selectedGroupId) return "Group is required.";
    if (!date) return "Date is required.";
    if (!observations.trim()) return "Observations are required.";
    return null;
  }

  async function submitLog() {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    try {
      await api.post("/experiment/logs", {
        allocation_id: Number(allocationId),
        group_id: Number(selectedGroupId),
        procedure_id: selectedProcedureId ? Number(selectedProcedureId) : null,
        date,
        observations,
        morbidity: morbidity || null,
        mortality: mortality || null,
        endpoint: endpoint || null,
      });

      setObservations("");
      setMorbidity("");
      setMortality("");
      setEndpoint("");
      setSelectedProcedureId("");

      await loadData();
      alert("Log entry saved.");
    } catch {
      alert("Failed to save log entry.");
    }
  }

  if (loading) {
    return (
      <div className="page-card">
        <p>Loading experiment logs...</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Experiment Logs</h2>
        <p>Allocation ID: {allocationId}</p>
      </header>

      <section className="dashboard-section">
        <h3>Add New Log Entry</h3>

        <div className="form-grid">
          <label>
            Group
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">Select group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Procedure (optional)
            <select
              value={selectedProcedureId}
              onChange={(e) => setSelectedProcedureId(e.target.value)}
            >
              <option value="">Select procedure</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label>
            Observations
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Clinical signs, behaviour, body weight, etc."
            />
          </label>

          <label>
            Morbidity (optional)
            <input
              type="text"
              value={morbidity}
              onChange={(e) => setMorbidity(e.target.value)}
              placeholder="e.g., 1 animal showing lethargy"
            />
          </label>

          <label>
            Mortality (optional)
            <input
              type="text"
              value={mortality}
              onChange={(e) => setMortality(e.target.value)}
              placeholder="e.g., 1 animal died"
            />
          </label>

          <label>
            Endpoint (optional)
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="e.g., humane endpoint reached"
            />
          </label>

          <button className="btn" onClick={submitLog}>
            Save Log Entry →
          </button>
        </div>
      </section>

      <hr />

      <section className="dashboard-section">
        <h3>Existing Log Entries</h3>

        {logs.length === 0 && <p>No logs recorded yet.</p>}

        {logs.map((log) => (
          <div key={log.id} className="dashboard-card">
            <p>
              <strong>Date:</strong> {formatDisplayDate(log.date)}
            </p>
            <p>
              <strong>Group:</strong> {log.group_name}
            </p>
            {log.procedure_name && (
              <p>
                <strong>Procedure:</strong> {log.procedure_name}
              </p>
            )}
            <p>
              <strong>Observations:</strong> {log.observations}
            </p>
            {log.morbidity && (
              <p>
                <strong>Morbidity:</strong> {log.morbidity}
              </p>
            )}
            {log.mortality && (
              <p>
                <strong>Mortality:</strong> {log.mortality}
              </p>
            )}
            {log.endpoint && (
              <p>
                <strong>Endpoint:</strong> {log.endpoint}
              </p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
