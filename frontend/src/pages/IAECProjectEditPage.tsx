import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { getProjectById, updateProject } from "../api/iaecApi";
import type { IAECProject, IAECProjectCreate } from "../api/types";

import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { IAECProjectForm } from "../components/forms/IAECProjectForm";

export function IAECProjectEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const projectId = Number(id);

  const [project, setProject] = useState<IAECProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getProjectById(projectId);
        setProject(data);
      } catch (err) {
        setError("Failed to load project for editing.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [projectId]);

  async function handleUpdate(values: IAECProjectCreate) {
    try {
      await updateProject(projectId, values);
      navigate(`/iaec-projects/${projectId}`);
    } catch {
      alert("Failed to update project.");
    }
  }

  if (loading) return <LoadingState label="Loading project..." />;
  if (error) return <ErrorAlert message={error} />;
  if (!project) return <p>Project not found.</p>;

  return (
    <div className="page-grid">
      <PageSection
        title={`Edit IAEC Project #${project.id}`}
        subtitle="PUT /iaec/project/:id"
      >
        <IAECProjectForm
          initialValues={project}
          onCreated={handleUpdate}
          submitLabel="Update Project"
        />
      </PageSection>
    </div>
  );
}
