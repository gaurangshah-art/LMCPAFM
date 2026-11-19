import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import {
  downloadScheduleVPdf,
  finalizeFormBApproval,
  saveMeetingAttendance,
  sendFormBMeetingInvitation,
  sendMeetingIaecReviewPacks,
  updateMeeting,
} from "../../api/iaecApi";
import { formatDisplayDate } from "../../utils/dateFormat";
import { getApiErrorMessage } from "../../api/errors";
import type { IAECMeetingAttendanceRecord } from "../../api/types";

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
    minutes_item1?: string;
    minutes_item2?: string;
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
  attendance: IAECMeetingAttendanceRecord[];
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
  const [attendance, setAttendance] = useState<IAECMeetingAttendanceRecord[]>([]);
  const [minutesItem1, setMinutesItem1] = useState("");
  const [minutesItem2, setMinutesItem2] = useState("");
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [downloadingScheduleV, setDownloadingScheduleV] = useState(false);
  const [sendingMemberPacks, setSendingMemberPacks] = useState(false);
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
      setAttendance(data.attendance ?? []);
      setMinutesItem1(data.meeting.minutes_item1 ?? "");
      setMinutesItem2(data.meeting.minutes_item2 ?? data.meeting.minutes ?? "");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMeetingDetails();
  }, [meetingId]);

  async function handleSaveMinutes() {
    if (!meetingId) return;
    setSavingMinutes(true);
    setActionMessage(null);
    try {
      await updateMeeting(Number(meetingId), {
        minutes_item1: minutesItem1,
        minutes_item2: minutesItem2,
        minutes: minutesItem2,
      });
      setActionMessage("Minutes text saved.");
      await loadMeetingDetails();
    } catch (error) {
      setActionMessage(getApiErrorMessage(error));
    } finally {
      setSavingMinutes(false);
    }
  }

  async function handleSaveAttendance() {
    if (!meetingId) return;
    setSavingAttendance(true);
    setActionMessage(null);
    try {
      const saved = await saveMeetingAttendance(
        Number(meetingId),
        attendance.map((row) => ({ member_id: row.member_id, present: row.present })),
      );
      setAttendance(saved);
      setActionMessage("Attendance saved.");
    } catch (error) {
      setActionMessage(getApiErrorMessage(error));
    } finally {
      setSavingAttendance(false);
    }
  }

  async function handleDownloadScheduleV() {
    if (!meetingId) return;
    setDownloadingScheduleV(true);
    setActionMessage(null);
    try {
      const blob = await downloadScheduleVPdf(Number(meetingId));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `IAEC_Schedule_V_Meeting_${meeting?.meeting_number ?? meetingId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      setActionMessage("Schedule V PDF downloaded — collect signatures, then upload to CPCSEA.");
    } catch (error) {
      setActionMessage(getApiErrorMessage(error));
    } finally {
      setDownloadingScheduleV(false);
    }
  }

  async function handleEmailIaecReviewPacks() {
    if (!meetingId) return;
    if (
      !window.confirm(
        "Email all IAEC members the meeting review agenda plus a Form B review pack (checklist + PDF) for each protocol assigned to this meeting?",
      )
    ) {
      return;
    }
    setSendingMemberPacks(true);
    setActionMessage(null);
    try {
      const result = await sendMeetingIaecReviewPacks(Number(meetingId));
      setActionMessage(
        `Review pack sent to ${result.sent_to.join(", ")} (1 merged PDF, ${result.protocol_count} protocol(s)).`,
      );
    } catch (error) {
      setActionMessage(getApiErrorMessage(error));
    } finally {
      setSendingMemberPacks(false);
    }
  }

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
        <h3>Schedule V minutes (same-day draft)</h3>
        <p className="field-help">
          Save Items 1–2, confirm attendance, record protocol decisions below, then download PDF
          for signatures. Upload signed copy to CPCSEA within 15 days.
        </p>
        <label className="full-width">
          Item 1 — Confirmation of previous minutes
          <textarea
            rows={3}
            value={minutesItem1}
            onChange={(e) => setMinutesItem1(e.target.value)}
            placeholder="Leave blank to auto-generate from the prior meeting on export."
          />
        </label>
        <label className="full-width">
          Item 2 — Other agenda
          <textarea rows={4} value={minutesItem2} onChange={(e) => setMinutesItem2(e.target.value)} />
        </label>
        <div className="wizard-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={savingMinutes}
            onClick={() => void handleSaveMinutes()}
          >
            {savingMinutes ? "Saving…" : "Save minutes text"}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={downloadingScheduleV}
            onClick={() => void handleDownloadScheduleV()}
          >
            {downloadingScheduleV ? "Preparing PDF…" : "Download Schedule V PDF"}
          </button>
        </div>
      </section>

      <section className="dashboard-section">
        <h3>Attendance</h3>
        {attendance.length === 0 ? (
          <p>
            No IAEC members configured.{" "}
            <button type="button" className="btn-link" onClick={() => navigate("/iaec/members")}>
              Add IAEC members
            </button>{" "}
            before exporting Schedule V.
          </p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Present</th>
                  <th>Name</th>
                  <th>Designation</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => (
                  <tr key={row.member_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.present}
                        onChange={(e) =>
                          setAttendance((prev) =>
                            prev.map((item) =>
                              item.member_id === row.member_id
                                ? { ...item, present: e.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>{row.full_name}</td>
                    <td>{row.designation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="btn-secondary"
              disabled={savingAttendance}
              onClick={() => void handleSaveAttendance()}
            >
              {savingAttendance ? "Saving…" : "Save attendance"}
            </button>
          </>
        )}
      </section>

      <section className="dashboard-section">
        <h3>Assigned Form B Projects (Item 3)</h3>
        <p className="field-help">
          Before the meeting, use <strong>Email IAEC review packs</strong> to send committee members
          one merged PDF (meeting agenda plus each submitted Form B with protocol checklist). Use{" "}
          <strong>Send invitation</strong> per row to notify the principal investigator separately.
        </p>
        {assignedProjects.length === 0 ? (
          <p>No Form B protocols assigned to this meeting.</p>
        ) : (
          <>
          <div className="wizard-actions" style={{ marginBottom: "1rem" }}>
            <button
              type="button"
              className="btn-primary"
              disabled={sendingMemberPacks}
              onClick={() => void handleEmailIaecReviewPacks()}
            >
              {sendingMemberPacks ? "Sending…" : "Email IAEC review packs"}
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Investigator</th>
                <th>Status</th>
                <th>Protocol</th>
                <th>Decision</th>
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
                  <td>{project.decision || "Pending"}</td>
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
          </>
        )}
      </section>

      <div className="wizard-actions">
        <button type="button" className="btn-secondary" onClick={() => navigate("/iaec-dashboard")}>
          Back to Dashboard
        </button>
        <button type="button" className="btn-secondary" onClick={() => navigate("/iaec/members")}>
          Manage IAEC members
        </button>
      </div>
    </div>
  );
}
