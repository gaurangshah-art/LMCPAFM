import { useEffect, useState } from "react";
import { getProjects } from "../api/iaecApi";
import { getApiErrorMessage } from "../api/errors";
import type { IAECProject } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { IAECProjectForm } from "../components/forms/IAECProjectForm";
import { ProjectTable } from "../components/tables/ProjectTable";

export function IAECProjectPage() {
  const [projects, setProjects] = useState<IAECProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <div className="page-grid">
      <PageSection title="Create IAEC Project" subtitle="POST /iaec/project">
        <IAECProjectForm onCreated={(project) => setProjects((prev) => [project, ...prev])} />
      </PageSection>

      <PageSection title="Existing IAEC Projects" subtitle="GET /iaec/project">
        {isLoading ? <LoadingState label="Fetching projects..." /> : null}
        {error ? <ErrorAlert message={error} /> : null}
        {!isLoading && !error ? <ProjectTable projects={projects} /> : null}
      </PageSection>
    </div>
  );
}
