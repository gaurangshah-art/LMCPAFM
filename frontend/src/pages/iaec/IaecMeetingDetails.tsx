import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { formatDisplayDate } from "../../utils/dateFormat";

import type { IAECMeeting, IAECReviewProject } from "../../api/types";

export function IaecMeetingDetails() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [meeting, setMeeting] = useState<IAECMeeting | null>(null);
  const [assignedProjects, setAssignedProjects] = useState<IAECReviewProject[]>([]);

  async function loadMeeting() {
    setLoading(true);
    try {
      const res = await api.get(`/iaec/meetings/${meetingId}`);
      setMeeting(res.data.meeting);
      setAssignedProjects(res.data.assigned_projects);
    } catch {
      alert("Failed to load meeting details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  async function generateProjectId(formBId: number) {
    if (!window.confirm("Generate LMCP/IAEC ID for this project?")) return;

    try {
      const res = await api.post(
        `/iaec/meetings/${meetingId}/generate-id/${formBId}`
      );
      alert(`Generated ID: ${res.data.lmcp_iaec_id}`);
      loadMeeting();
    } catch {
      alert("Failed to generate ID.");
    }
  }

  async function markMeetingCompleted() {
    if (!window.confirm("Mark this meeting as completed?")) return;

    try {
      await api.post(`/iaec/meetings/${meetingId}/complete`);
      alert("Meeting marked as completed.");
      navigate("/iaec/dashboard");
    } catch {
      alert("Failed to update meeting status.");
    }
  }

  if (loading || !meeting) {
    return (
      <div className="page-card">
        <p>Loading meeting details...</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>IAEC Meeting Details</h2>
        <p>Review projects assigned to this meeting.</p>
      </header>

      <div className="meeting-info">
        <p><strong>Meeting Year:</strong> {meeting.meeting_year}</p>
        <p><strong>Meeting Number:</strong> {meeting.meeting_number}</p>
        <p><strong>Date:</strong> {formatDisplayDate(meeting.meeting_date)}</p>
        <p><strong>Status:</strong> {meeting.status}</p>
      </div>

      <section className="dashboard-section">
        <h3>Assigned Projects</h3>

        {assignedProjects.length === 0 && (
          <p>No projects assigned to this meeting.</p>
        )}

        {assignedProjects.map((p) => (
          <div key={p.id} className="dashboard-card">
            <p><strong>Form B ID:</strong> {p.form_b_id}</p>
            <p><strong>Investigator:</strong> {p.investigator}</p>
            <p><strong>Project Title:</strong> {p.title}</p>

            {p.lmcp_iaec_id ? (
              <p><strong>LMCP/IAEC ID:</strong> {p.lmcp_iaec_id}</p>
            ) : (
              <button
                className="btn"
                onClick={() => generateProjectId(p.form_b_id)}
              >
                Generate LMCP/IAEC ID
              </button>
            )}

            <button
              className="btn"
              onClick={() => navigate(`/iaec/project/${p.id}`)}
            >
              Review Project →
            </button>
          </div>
        ))}
      </section>

      <div className="wizard-actions">
        <button className="btn-secondary" onClick={() => navigate("/iaec/dashboard")}>
          ← Back to Dashboard
        </button>

        <button className="btn" onClick={markMeetingCompleted}>
          Mark Meeting Completed →
        </button>
      </div>
    </div>
  );
}
