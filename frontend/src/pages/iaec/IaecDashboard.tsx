import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { formatDisplayDate } from "../../utils/dateFormat";
import type {
  IAECMeeting,
  IAECReviewProject,
  IAECSubmittedForm,
} from "../../api/types";

export function IaecDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submittedForms, setSubmittedForms] = useState<IAECSubmittedForm[]>([]);
  const [meetings, setMeetings] = useState<IAECMeeting[]>([]);
  const [projectsUnderReview, setProjectsUnderReview] = useState<IAECReviewProject[]>([]);
  const [approvedProjects, setApprovedProjects] = useState<IAECReviewProject[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/iaec/dashboard");
      setSubmittedForms(res.data.submitted_forms);
      setMeetings(res.data.meetings);
      setProjectsUnderReview(res.data.projects_under_review);
      setApprovedProjects(res.data.approved_projects);
    } catch {
      alert("Failed to load IAEC dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/iaec/dashboard");
        if (cancelled) return;
        setSubmittedForms(res.data.submitted_forms);
        setMeetings(res.data.meetings);
        setProjectsUnderReview(res.data.projects_under_review);
        setApprovedProjects(res.data.approved_projects);
      } catch {
        if (!cancelled) {
          alert("Failed to load IAEC dashboard.");
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
  }, []);

  async function assignToMeeting(formBId: number, meetingId: string) {
    if (!window.confirm("Assign this Form B to the selected meeting?")) return;

    try {
      await api.post(`/iaec/meetings/${meetingId}/assign/${formBId}`);
      alert("Assigned successfully.");
      loadDashboard();
    } catch {
      alert("Failed to assign.");
    }
  }

  async function generateProjectId(formBId: number, meetingId: number) {
    if (!window.confirm("Generate LMCP/IAEC ID for this project?")) return;

    try {
      const res = await api.post(`/iaec/meetings/${meetingId}/generate-id/${formBId}`);
      alert(`Generated ID: ${res.data.lmcp_iaec_id}`);
      loadDashboard();
    } catch {
      alert("Failed to generate ID.");
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>IAEC Dashboard</h2>
        <p>Manage meetings, review projects, and generate LMCP/IAEC IDs.</p>
      </header>

      {loading && <p>Loading...</p>}

      {/* Submitted Forms */}
      <section className="dashboard-section">
        <h3>Submitted Form B (Pending Assignment)</h3>

        {submittedForms.length === 0 && <p>No pending submissions.</p>}

        {submittedForms.map((form) => (
          <div key={form.id} className="dashboard-card">
            <p><strong>Form B ID:</strong> {form.id}</p>
            <p><strong>Investigator:</strong> {form.principal_investigator}</p>
            <p><strong>Project Title:</strong> {form.title}</p>

            <label>
              Assign to Meeting:
              <select
                onChange={(e) => assignToMeeting(form.id, e.target.value)}
              >
                <option value="">Select meeting</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meeting_year} / Meeting {m.meeting_number}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </section>

      {/* Meetings */}
      <section className="dashboard-section">
        <h3>IAEC Meetings</h3>

        {meetings.length === 0 && <p>No meetings created.</p>}

        {meetings.map((m) => (
          <div key={m.id} className="dashboard-card">
            <p><strong>Meeting:</strong> {m.meeting_year} / {m.meeting_number}</p>
            <p><strong>Date:</strong> {formatDisplayDate(m.meeting_date)}</p>
            <p><strong>Status:</strong> {m.status}</p>

            <button
              className="btn"
              onClick={() => navigate(`/iaec/meetings/${m.id}`)}
            >
              View Meeting →
            </button>
          </div>
        ))}

        <button className="btn" onClick={() => navigate("/iaec/create-meeting")}>
          + Create New Meeting
        </button>
      </section>

      {/* Projects Under Review */}
      <section className="dashboard-section">
        <h3>Projects Under Review</h3>

        {projectsUnderReview.length === 0 && <p>No projects under review.</p>}

        {projectsUnderReview.map((p) => (
          <div key={p.id} className="dashboard-card">
            <p><strong>Form B ID:</strong> {p.form_b_id}</p>
            <p><strong>Meeting:</strong> {p.meeting_year}/{p.meeting_number}</p>

            {!p.lmcp_iaec_id && (
              <button
                className="btn"
                onClick={() => {
                  if (p.meeting_id != null) {
                    generateProjectId(p.form_b_id, p.meeting_id);
                  }
                }}
              >
                Generate LMCP/IAEC ID
              </button>
            )}

            {p.lmcp_iaec_id && (
              <button
                className="btn"
                onClick={() => navigate(`/iaec/project/${p.id}`)}
              >
                Review Project →
              </button>
            )}
          </div>
        ))}
      </section>

      {/* Approved Projects */}
      <section className="dashboard-section">
        <h3>Approved Projects</h3>

        {approvedProjects.length === 0 && <p>No approved projects.</p>}

        {approvedProjects.map((p) => (
          <div key={p.id} className="dashboard-card">
            <p><strong>LMCP/IAEC ID:</strong> {p.lmcp_iaec_id}</p>
            <p><strong>Investigator:</strong> {p.investigator}</p>
            <p><strong>Project:</strong> {p.title}</p>

            <button
              className="btn"
              onClick={() => navigate(`/iaec/project/${p.id}`)}
            >
              View Project →
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
