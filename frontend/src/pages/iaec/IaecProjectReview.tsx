import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProjectById } from "../../api/iaecApi";
import { apiClient } from "../../api/client";
import { getApiErrorMessage } from "../../api/errors";
import type { IAECProject } from "../../api/types";

interface FormBRecord {
  id: number;
  project_id: number;
  date: string;
  meeting_id?: number | null;
  protocol_number?: string | null;
}

export function IaecProjectReview() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [project, setProject] = useState<IAECProject | null>(null);
  const [formB, setFormB] = useState<FormBRecord | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    (async () => {
      try {
        const [projectData, formBResponse] = await Promise.all([
          getProjectById(Number(projectId)),
          apiClient.get<FormBRecord>(`/iaec/project/${projectId}/form-b`),
        ]);
        if (!cancelled) {
          setProject(projectData);
          setFormB(formBResponse.data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getApiErrorMessage(error));
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
  }, [projectId]);

  if (loading) {
    return (
      <div className="page-card">
        <p>Loading project review...</p>
      </div>
    );
  }

  if (!project || !formB) {
    return (
      <div className="page-card">
        <p className="error-text">{errorMessage ?? "Failed to load project review."}</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>IAEC Project Review</h2>
        <p>{project.title}</p>
      </header>

      <p><strong>Investigator:</strong> {project.investigator_name}</p>
      <p><strong>Status:</strong> {project.status || "draft"}</p>
      <p><strong>Form B ID:</strong> {formB.id}</p>
      <p><strong>Protocol:</strong> {formB.protocol_number || project.protocol_number || "Pending"}</p>

      <div className="wizard-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate("/iaec-dashboard")}
        >
          Back
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate(`/iaec/project/${projectId}/certificate`)}
        >
          View Certificate
        </button>
      </div>
    </div>
  );
}
