import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function RequisitionForm() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);

  const [species, setSpecies] = useState("");
  const [strain, setStrain] = useState("");
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    async function loadProject() {
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data);
    }
    loadProject();
  }, [projectId]);

  function validate() {
    if (!species) return "Species is required.";
    if (!strain) return "Strain is required.";
    if (!sex) return "Sex is required.";
    if (!age.trim()) return "Age is required.";
    if (!quantity || Number(quantity) <= 0) return "Quantity must be > 0.";
    if (!purpose.trim()) return "Purpose is required.";
    return null;
  }

  async function submitRequisition() {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);

    try {
      await api.post("/requisition", {
        project_id: projectId,
        lmcp_iaec_id: project.lmcp_iaec_id,
        species,
        strain,
        sex,
        age,
        quantity_requested: Number(quantity),
        purpose,
      });

      alert("Requisition submitted.");
      navigate("/requisition/my");
    } catch {
      alert("Failed to submit requisition.");
    } finally {
      setLoading(false);
    }
  }

  if (!project) return <p>Loading...</p>;

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Animal Requisition</h2>
        <p>Project: {project.title}</p>
        <p>LMCP/IAEC ID: {project.lmcp_iaec_id}</p>
      </header>

      <div className="form-grid">
        <label>
          Species
          <select value={species} onChange={(e) => setSpecies(e.target.value)}>
            <option value="">Select species</option>
            <option value="Rat">Rat</option>
            <option value="Mouse">Mouse</option>
            <option value="Rabbit">Rabbit</option>
          </select>
        </label>

        <label>
          Strain
          <select value={strain} onChange={(e) => setStrain(e.target.value)}>
            <option value="">Select strain</option>
            <option value="Wistar">Wistar</option>
            <option value="Sprague Dawley">Sprague Dawley</option>
            <option value="Swiss Albino">Swiss Albino</option>
          </select>
        </label>

        <label>
          Sex
          <select value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">Select sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>

        <label>
          Age
          <input
            type="text"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g., 6–8 weeks"
          />
        </label>

        <label>
          Quantity Requested
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>

        <label>
          Purpose
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Describe why animals are needed..."
          />
        </label>
      </div>

      <div className="wizard-actions">
        <button className="btn" onClick={submitRequisition} disabled={loading}>
          Submit Requisition →
        </button>
      </div>
    </div>
  );
}
