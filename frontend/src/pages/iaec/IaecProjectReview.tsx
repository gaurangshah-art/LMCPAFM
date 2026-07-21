import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function IaecProjectReview() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [formB, setFormB] = useState(null);
  const [comments, setComments] = useState("");

  async function loadProject() {
    setLoading(true);
    try {
      const res = await api.get(`/iaec/project/${projectId}`);
      setProject(res.data.project);
      setFormB(res.data.form_b);
    } catch {
      alert("Failed to load project.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function approveProject() {
    if (!window.confirm("Approve this project?")) return;

    try {
      await api.post(`/iaec/project/${projectId}/approve`, {
        comments,
      });

      alert("Project approved.");
      navigate("/iaec/dashboard");
    } catch {
      alert("Failed to approve project.");
    }
  }

  async function rejectProject() {
    if (!window.confirm("Reject this project?")) return;

    try {
      await api.post(`/iaec/project/${projectId}/reject`, {
        comments,
      });

      alert("Project rejected.");
      navigate("/iaec/dashboard");
    } catch {
      alert("Failed to reject project.");
    }
  }

  if (loading || !project || !formB) {
    return (
      <div className="page-card">
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>IAEC Project Review</h2>
        <p>Review full Form B and approve or reject.</p>
      </header>

      <div className="meeting-info">
        <p><strong>LMCP/IAEC ID:</strong> {project.lmcp_iaec_id || "Not generated yet"}</p>
        <p><strong>Form B ID:</strong> {project.form_b_id}</p>
        <p><strong>Meeting:</strong> {project.meeting_year}/{project.meeting_number}</p>
        <p><strong>Status:</strong> {project.status}</p>
      </div>

      <hr />

      {/* Full Form B Display */}
      <section className="review-section">
        <h3>Form B – Full Submission</h3>

        <details>
          <summary>Step 1 – Investigator & Establishment</summary>
          <pre>{JSON.stringify(formB.step1, null, 2)}</pre>
        </details>

        <details>
          <summary>Step 2 – Project Details</summary>
          <pre>{JSON.stringify(formB.step2, null, 2)}</pre>
        </details>

        <details>
          <summary>Step 3 – Animal Requirements</summary>
          <pre>{JSON.stringify(formB.step3, null, 2)}</pre>
        </details>

        <details>
          <summary>Step 4 – Experimental Design</summary>
          <pre>{JSON.stringify(formB.step4, null, 2)}</pre>
        </details>

        <details>
          <summary>Step 5 – Housing & Husbandry</summary>
          <pre>{JSON.stringify(formB.step5, null, 2)}</pre>
        </details>

        <details>
          <summary>Step 6 – Personnel & Training</summary>
          <pre>{JSON.stringify(formB.step6, null, 2)}</pre>
        </details>

        <details>
          <summary>Step 7 – Ethical Compliance</summary>
          <pre>{JSON.stringify(formB.step7, null, 2)}</pre>
        </details>
      </section>

      <hr />

      {/* IAEC Review Section */}
      <section className="review-section">
        <h3>IAEC Review Comments</h3>

        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Enter IAEC comments..."
        />

        <div className="wizard-actions">
          <button className="btn-secondary" onClick={() => navigate("/iaec/dashboard")}>
            ← Back
          </button>

          <button className="btn" onClick={approveProject}>
            Approve Project →
          </button>

          <button className="btn-danger" onClick={rejectProject}>
            Reject Project →
          </button>
        </div>
      </section>
    </div>
  );
}
