import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects } from "../api/iaecApi";
import { getApiErrorMessage } from "../api/errors";
import type { IAECProject } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageHeader } from "../components/common/PageHeader";
import { PageSection } from "../components/common/PageSection";
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
      <PageHeader
        eyebrow="IAEC"
        title="IAEC projects"
        subtitle="Projects are created automatically when investigators submit Form B. Use this list to review linked protocol records."
      />

      <PageSection title="How projects are created">
        <p className="muted-text">
          Manual project creation has been disabled. Investigators start at{" "}
          <Link to="/form-b/step-1">Form B Step 1</Link>; a draft IAEC project is created in the
          background and moves into the IAEC decision cycle only after full Form B submission.
        </p>
      </PageSection>

      <PageSection title="Existing IAEC projects" subtitle="All protocol records linked to Form B">
        {isLoading ? <LoadingState label="Fetching projects..." /> : null}
        {error ? <ErrorAlert message={error} /> : null}
        {!isLoading && !error ? <ProjectTable projects={projects} /> : null}
      </PageSection>
    </div>
  );
}
