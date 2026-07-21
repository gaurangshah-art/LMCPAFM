import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function ExperimentEntryPage() {
  const { allocationId } = useParams();
  const navigate = useNavigate();

  const [allocation, setAllocation] = useState(null);
  const [groups, setGroups] = useState([]);
  const [procedures, setProcedures] = useState([]);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSize, setNewGroupSize] = useState("");

  const [newProcedureName, setNewProcedureName] = useState("");
  const [newProcedureDesc, setNewProcedureDesc] = useState("");

  useEffect(() => {
    async function loadData() {
      const res = await api.get(`/experiment/entry/${allocationId}`);
      setAllocation(res.data.allocation);
      setGroups(res.data.groups);
      setProcedures(res.data.procedures);
    }
    loadData();
  }, [allocationId]);

  async function addGroup() {
    if (!newGroupName.trim()) return alert("Group name required.");
    if (!newGroupSize || Number(newGroupSize) <= 0)
      return alert("Group size must be > 0.");

    await api.post(`/experiment/groups`, {
      allocation_id: allocationId,
      name: newGroupName,
      size: Number(newGroupSize),
    });

    setNewGroupName("");
    setNewGroupSize("");
    const res = await api.get(`/experiment/entry/${allocationId}`);
    setGroups(res.data.groups);
  }

  async function addProcedure() {
    if (!newProcedureName.trim()) return alert("Procedure name required.");
    if (!newProcedureDesc.trim()) return alert("Procedure description required.");

    await api.post(`/experiment/procedures`, {
      allocation_id: allocationId,
      name: newProcedureName,
      description: newProcedureDesc,
    });

    setNewProcedureName("");
    setNewProcedureDesc("");
    const res = await api.get(`/experiment/entry/${allocationId}`);
    setProcedures(res.data.procedures);
  }

  async function startExperiment() {
    if (!window.confirm("Start experiment? Groups and procedures will be locked.")) return;

    await api.post(`/experiment/start/${allocationId}`);
    alert("Experiment started.");
    navigate(`/experiment/logs/${allocationId}`);
  }

  if (!allocation) return <p>Loading experiment setup...</p>;

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Experiment Setup</h2>
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

      {/* Groups */}
      <section className="dashboard-section">
        <h3>Groups</h3>

        {groups.map((g) => (
          <div key={g.id} className="dashboard-card">
            <p><strong>{g.name}</strong></p>
            <p>Size: {g.size}</p>
          </div>
        ))}

        <div className="form-grid">
          <label>
            Group Name
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g., Control"
            />
          </label>

          <label>
            Group Size
            <input
              type="number"
              value={newGroupSize}
              onChange={(e) => setNewGroupSize(e.target.value)}
            />
          </label>

          <button className="btn" onClick={addGroup}>
            Add Group →
          </button>
        </div>
      </section>

      <hr />

      {/* Procedures */}
      <section className="dashboard-section">
        <h3>Procedures</h3>

        {procedures.map((p) => (
          <div key={p.id} className="dashboard-card">
            <p><strong>{p.name}</strong></p>
            <p>{p.description}</p>
          </div>
        ))}

        <div className="form-grid">
          <label>
            Procedure Name
            <input
              value={newProcedureName}
              onChange={(e) => setNewProcedureName(e.target.value)}
              placeholder="e.g., Drug Administration"
            />
          </label>

          <label>
            Description
            <textarea
              value={newProcedureDesc}
              onChange={(e) => setNewProcedureDesc(e.target.value)}
              placeholder="Describe the procedure..."
            />
          </label>

          <button className="btn" onClick={addProcedure}>
            Add Procedure →
          </button>
        </div>
      </section>

      <hr />

      <div className="wizard-actions">
        <button className="btn" onClick={startExperiment}>
          Start Experiment →
        </button>
      </div>
    </div>
  );
}
