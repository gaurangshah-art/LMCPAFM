import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getProjectById,
  getGroupsByProject,
  getIAECExperimentsByGroup,
  addProjectComment,
  approveProject,
  rejectProject,
} from "../api/iaecApi";

import type {
  IAECProject,
  ExperimentGroup,
  AnimalExperiment,
} from "../api/types";

import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";

export function IAECProjectViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = Number(id);

  const [project, setProject] = useState<IAECProject | null>(null);
  const [groups, setGroups] = useState<ExperimentGroup[]>([]);
  const [experiments, setExperiments] = useState<Record<number, AnimalExperiment[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  async function loadProject() {
    try {
      setLoading(true);

      const proj = await getProjectById(projectId);
      setProject(proj);

      const grp = await getGroupsByProject(projectId);
      setGroups(grp);

      const expMap: Record<number, AnimalExperiment[]> = {};
      for (const g of grp) {
        expMap[g.id] = await getIAECExperimentsByGroup(g.id);
      }
      setExperiments(expMap);

    } catch {
      setError("Failed to load project details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProject();
  }, [projectId]);

  async function handleAddComment() {
    if (!commentText.trim()) return;

    try {
      const updated = await addProjectComment(projectId, commentText);
      setProject(updated);
      setCommentText("");
    } catch {
      alert("Failed to add comment.");
    }
  }

  async function handleApprove() {
    try {
      const updated = await approveProject(projectId);
      setProject(updated);
      alert("Project approved.");
    } catch {
      alert("Failed to approve project.");
    }
  }

  async function handleReject() {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      const updated = await rejectProject(projectId, reason);
      setProject(updated);
      alert("Project rejected.");
    } catch {
      alert("Failed to reject project.");
    }
  }

  if (loading) return <LoadingState label="Loading project..." />;
  if (error) return <ErrorAlert message={error} />;
  if (!project) return <p>Project not found.</p>;

  return (
    <section className="page-card">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <span onClick={() => navigate("/")}>Home</span> →
        <span onClick={() => navigate("/iaec-projects")}>IAEC Projects</span> →
        <span>Project #{project.id}</span>
      </div>

      <header className="section-header">
        <h2>IAEC Project #{project.id}</h2>
        <p>{project.title}</p>

        <button className="btn" onClick={() => navigate("/iaec-projects")}>
          ← Back to Projects
        </button>
      </header>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <h4>Status</h4>
          <p>{project.status}</p>
        </div>
        <div className="summary-card">
          <h4>Species</h4>
          <p>{project.species}</p>
        </div>
        <div className="summary-card">
          <h4>Animal Count</h4>
          <p>{project.animal_count}</p>
        </div>
        <div className="summary-card">
          <h4>Groups</h4>
          <p>{groups.length}</p>
        </div>
        <div className="summary-card">
          <h4>Experiments</h4>
          <p>{Object.values(experiments).flat().length}</p>
        </div>
      </div>

      {/* Project Details */}
      <div className="detail-grid">
        <div>
          <h3>Project Details</h3>
          <p><strong>Investigator:</strong> {project.investigator_name}</p>
          <p><strong>Status:</strong> {project.status}</p>
          <p><strong>Species:</strong> {project.species}</p>
          <p><strong>Animal Count:</strong> {project.animal_count}</p>
          <p><strong>Summary:</strong> {project.summary}</p>
        </div>

        {/* Comments */}
        <div>
          <h3>IAEC Comments</h3>

          {project.comments?.length === 0 ? (
            <p>No comments yet.</p>
          ) : (
            <ul>
              {project.comments?.map((c: string, idx: number) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          )}

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add IAEC comment..."
          />

          <button className="btn-small" onClick={handleAddComment}>
            Add Comment
          </button>
        </div>
      </div>

      <hr />

      {/* Experiment Groups */}
      <h3>Experiment Groups</h3>

      {groups.length === 0 ? (
        <p>No experiment groups.</p>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="group-card">
            <h4 onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}>
              Group #{g.id}: {g.name}
            </h4>

            {expandedGroup === g.id && (
              <>
                <p><strong>Purpose:</strong> {g.purpose}</p>

                <h5>Experiments</h5>

                {experiments[g.id]?.length === 0 ? (
                  <p>No experiments.</p>
                ) : (
                  <ul>
                    {experiments[g.id].map((exp) => (
                      <li key={exp.id}>
                        <strong>{exp.experiment_name}</strong> — {exp.description}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ))
      )}

      <hr />

      {/* Approve / Reject */}
      {project.status === "pending" && (
        <div className="approval-actions">
          <button className="btn success" onClick={handleApprove}>
            Approve Project
          </button>

          <button className="btn warning" onClick={handleReject}>
            Reject Project
          </button>
        </div>
      )}
    </section>
  );
}
