import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { formatDisplayDate } from "../../utils/dateFormat";
import { getApiErrorMessage } from "../../api/errors";

interface MeetingDetailsResponse {
  meeting: {
    id: number;
    date: string;
    meeting_number?: string | null;
    minutes: string;
  };
  assigned_projects: Array<{
    project_id: number;
    form_b_id: number;
    title: string;
    investigator_name: string;
    status?: string | null;
    protocol_number?: string | null;
  }>;
}

export function IaecMeetingDetails() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<MeetingDetailsResponse["meeting"] | null>(null);
  const [assignedProjects, setAssignedProjects] = useState<
    MeetingDetailsResponse["assigned_projects"]
  >([]);

  useEffect(() => {
    if (!meetingId) return;

    let cancelled = false;

    (async () => {
      try {
        const { data } = await apiClient.get<MeetingDetailsResponse>(
          `/iaec/meeting/${meetingId}/details`,
        );
        if (!cancelled) {
          setMeeting(data.meeting);
          setAssignedProjects(data.assigned_projects);
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
  }, [meetingId]);

  if (loading) {
    return (
      <div className="page-card">
        <p>Loading meeting details...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="page-card">
        <p className="error-text">{errorMessage ?? "Failed to load meeting."}</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>IAEC Meeting Details</h2>
        <p>
          Meeting {meeting.meeting_number || meeting.id} on {formatDisplayDate(meeting.date)}
        </p>
      </header>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <section className="dashboard-section">
        <h3>Assigned Form B Projects</h3>
        {assignedProjects.length === 0 ? (
          <p>No Form B protocols assigned to this meeting.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Investigator</th>
                <th>Status</th>
                <th>Protocol</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assignedProjects.map((project) => (
                <tr key={project.form_b_id}>
                  <td>{project.title}</td>
                  <td>{project.investigator_name}</td>
                  <td>{project.status || "-"}</td>
                  <td>{project.protocol_number || "Pending"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-small"
                      onClick={() => navigate(`/iaec/project/${project.project_id}/review`)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="wizard-actions">
        <button type="button" className="btn-secondary" onClick={() => navigate("/iaec-dashboard")}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
