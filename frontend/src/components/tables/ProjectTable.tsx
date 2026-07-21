import { useNavigate } from "react-router-dom";
import {
  deleteProject,
  approveProject,
  rejectProject,
} from "../../api/iaecApi";
import type { IAECProject } from "../../api/types";

interface ProjectTableProps {
  projects: IAECProject[];
}

export function ProjectTable({ projects }: ProjectTableProps) {
  const navigate = useNavigate();

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      await deleteProject(id);
      window.location.reload(); // simplest refresh
    } catch {
      alert("Failed to delete project.");
    }
  }

  async function handleApprove(id: number) {
    try {
      await approveProject(id);
      window.location.reload();
    } catch {
      alert("Failed to approve project.");
    }
  }

  async function handleReject(id: number) {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      await rejectProject(id, reason);
      window.location.reload();
    } catch {
      alert("Failed to reject project.");
    }
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Investigator</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {projects.map((project) => (
          <tr key={project.id}>
            <td>{project.id}</td>
            <td>{project.title}</td>
            <td>{project.investigator_name}</td>
            <td>{project.status}</td>

            <td className="actions">
              <button
                className="btn-small"
                onClick={() => navigate(`/iaec-projects/${project.id}`)}
              >
                View
              </button>

              <button
                className="btn-small"
                onClick={() => navigate(`/iaec-projects/${project.id}/edit`)}
              >
                Edit
              </button>

              <button
                className="btn-small danger"
                onClick={() => handleDelete(project.id)}
              >
                Delete
              </button>

              {project.status === "pending" && (
                <>
                  <button
                    className="btn-small success"
                    onClick={() => handleApprove(project.id)}
                  >
                    Approve
                  </button>

                  <button
                    className="btn-small warning"
                    onClick={() => handleReject(project.id)}
                  >
                    Reject
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
