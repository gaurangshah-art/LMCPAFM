import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { finalizeFormBApproval, sendFormBMeetingInvitation } from "../../api/iaecApi";
import { formatDisplayDate } from "../../utils/dateFormat";
import { getApiErrorMessage } from "../../api/errors";

const APPROVED_DECISIONS = ["approved", "approved_with_revisions", "animal_count_amended"];

function isApprovedDecision(decision: string | null | undefined): boolean {
  return Boolean(decision && APPROVED_DECISIONS.includes(decision));
}

function isProjectApproved(status: string | null | undefined): boolean {
  return (status || "").trim().toLowerCase() === "approved";
}

interface MeetingDetailsResponse {
  meeting: {
    id: number;
    date: string;
    meeting_number?: string | null;
    meeting_time?: string | null;
    venue?: string | null;
    minutes: string;
  };
  assigned_projects: Array<{
    project_id: number;
    form_b_id: number;
    title: string;
    investigator_name: string;
    status?: string | null;
    protocol_number?: string | null;
    decision?: string | null;
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
  const [sendingInvitationId, setSendingInvitationId] = useState<number | null>(null);
  const [finalizingApprovalId, setFinalizingApprovalId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function loadMeetingDetails() {
    if (!meetingId) return;
    try {
      const { data } = await apiClient.get<MeetingDetailsResponse>(
        `/iaec/meeting/${meetingId}/details`,
      );
      setMeeting(data.meeting);
      setAssignedProjects(data.assigned_projects);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMeetingDetails();
  }, [meetingId]);

  async function handleSendInvitation(formBId: number, projectTitle: string) {
    if (!window.confirm(`Send meeting invitation email for "${projectTitle}"?`)) return;

    setSendingInvitationId(formBId);
    setActionMessage(null);
    try {
      const result = await sendFormBMeetingInvitation(formBId);
      setActionMessage(
        `Invitation sent to ${result.sent_to}. Protocol number: ${result.protocol_number}`,
      );
      await loadMeetingDetails();
    } catch (error) {
      setActionMessage(getApiErrorMessage(error));
    } finally {
      setSendingInvitationId(null);
    }
  }

  async function handleFinalizeApproval(formBId: number, projectTitle: string) {
    if (
      !window.confirm(
        `Finalize IAEC approval for "${projectTitle}"? The investigator will be able to plan experiment groups and request animals.`,
      )
    ) {
      return;
    }

    setFinalizingApprovalId(formBId);
    setActionMessage(null);
    try {
      const result = await finalizeFormBApproval(formBId);
      setActionMessage(
        `Approval finalized for ${projectTitle}. Protocol ${result.protocol_number}; project status ${result.project_status}.`,
      );
      await loadMeetingDetails();
    } catch (error) {
      setActionMessage(getApiErrorMessage(error));
    } finally {
      setFinalizingApprovalId(null);
    }
  }

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
          {meeting.meeting_time ? ` at ${meeting.meeting_time}` : ""}
          {meeting.venue ? ` — ${meeting.venue}` : ""}
        </p>
      </header>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      {actionMessage ? <p className="muted-text">{actionMessage}</p> : null}

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
                <th>Actions</th>
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
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn-small"
                        onClick={() => navigate(`/iaec/project/${project.project_id}/review`)}
                      >
                        Review
                      </button>
                      <button
                        type="button"
                        className="btn-small"
                        disabled={sendingInvitationId === project.form_b_id}
                        onClick={() => void handleSendInvitation(project.form_b_id, project.title)}
                      >
                        {sendingInvitationId === project.form_b_id ? "Sending…" : "Send invitation"}
                      </button>
                      {project.protocol_number &&
                      isApprovedDecision(project.decision) &&
                      !isProjectApproved(project.status) ? (
                        <button
                          type="button"
                          className="btn-small"
                          disabled={finalizingApprovalId === project.form_b_id}
                          onClick={() =>
                            void handleFinalizeApproval(project.form_b_id, project.title)
                          }
                        >
                          {finalizingApprovalId === project.form_b_id
                            ? "Finalizing…"
                            : "Finalize approval"}
                        </button>
                      ) : null}
                    </div>
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
