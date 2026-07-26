import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  assignFormBMeeting,
  downloadMeetingSummaryPdf,
  generateFormBProtocolNumber,
  getFormBWithMeeting,
  getMeetings,
  sendFormBMeetingInvitation,
  upsertFormBMeetingDecision,
} from "../../api/iaecApi";
import type {
  FormBMeetingDecisionValue,
  FormBWithMeeting,
  IAECMeetingRecord,
} from "../../api/types";
import { DataTable, type TableColumn } from "../../components/tables/DataTable";
import { formatDisplayDate } from "../../utils/dateFormat";

const APPROVED_DECISIONS = ["approved", "approved_with_revisions", "animal_count_amended"];

export function IaecDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formBRows, setFormBRows] = useState<FormBWithMeeting[]>([]);
  const [meetings, setMeetings] = useState<IAECMeetingRecord[]>([]);
  const [decisionFormBId, setDecisionFormBId] = useState<number | null>(null);
  const [decisionValue, setDecisionValue] = useState<FormBMeetingDecisionValue>("approved");
  const [approvedAnimalCount, setApprovedAnimalCount] = useState("");
  const [decisionRemarks, setDecisionRemarks] = useState("");
  const [sendingInvitationId, setSendingInvitationId] = useState<number | null>(null);
  const [downloadingMeetingId, setDownloadingMeetingId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [forms, meetingRows] = await Promise.all([getFormBWithMeeting(), getMeetings()]);
      setFormBRows(forms);
      setMeetings(meetingRows);
    } catch {
      setError("Failed to load IAEC Form B records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleAssignMeeting(row: FormBWithMeeting, meetingId: string) {
    if (!meetingId) return;
    try {
      await assignFormBMeeting(row.form_b_id, Number(meetingId));
      await loadDashboard();
    } catch {
      alert("Failed to assign meeting.");
    }
  }

  async function handleGenerateProtocol(formBId: number) {
    if (!window.confirm("Generate LMCP/IAEC protocol number for this approved Form B?")) return;
    try {
      const result = await generateFormBProtocolNumber(formBId);
      alert(`Protocol number generated: ${result.protocol_number}`);
      await loadDashboard();
    } catch {
      alert("Failed to generate protocol number. Ensure meeting, decision, and meeting number are set.");
    }
  }

  async function handleSendInvitation(formBId: number) {
    if (!window.confirm("Send meeting invitation email to the principal investigator?")) return;

    setSendingInvitationId(formBId);
    try {
      await sendFormBMeetingInvitation(formBId);
      alert("Meeting invitation queued for delivery.");
    } catch {
      alert("Failed to queue meeting invitation. Ensure Step 1 email, meeting, and protocol number are set.");
    } finally {
      setSendingInvitationId(null);
    }
  }

  async function handleDownloadMeetingSummary(meetingId: number, meetingLabel: string) {
    setDownloadingMeetingId(meetingId);
    try {
      const blob = await downloadMeetingSummaryPdf(meetingId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `IAEC_Meeting_Summary_${meetingLabel.replace(/\s+/g, "_")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download meeting summary PDF.");
    } finally {
      setDownloadingMeetingId(null);
    }
  }

  async function handleSaveDecision(row: FormBWithMeeting) {
    if (row.meeting_id == null) return;
    try {
      await upsertFormBMeetingDecision(row.form_b_id, {
        meeting_id: row.meeting_id,
        decision: decisionValue,
        approved_animal_count:
          decisionValue === "animal_count_amended" ? Number(approvedAnimalCount) : null,
        remarks: decisionRemarks.trim() || null,
      });
      setDecisionFormBId(null);
      setApprovedAnimalCount("");
      setDecisionRemarks("");
      await loadDashboard();
    } catch {
      alert("Failed to save meeting decision.");
    }
  }

  const columns = useMemo<TableColumn<FormBWithMeeting>[]>(
    () => [
      { header: "Form B ID", cell: (row) => row.form_b_id },
      { header: "Project", cell: (row) => row.project_title },
      { header: "Form B date", cell: (row) => formatDisplayDate(row.form_b_date) },
      {
        header: "Meeting",
        cell: (row) =>
          row.meeting_id
            ? `${formatDisplayDate(row.meeting_date)} (#${row.meeting_number ?? row.meeting_id})`
            : "Not assigned",
      },
      { header: "Protocol", cell: (row) => row.protocol_number ?? "—" },
      { header: "Decision", cell: (row) => row.decision ?? "Not recorded" },
      {
        header: "Actions",
        cell: (row) => (
          <div className="table-actions">
            {!row.meeting_id ? (
              <select
                defaultValue=""
                onChange={(e) => {
                  void handleAssignMeeting(row, e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">Assign meeting…</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatDisplayDate(m.date)} / {m.meeting_number ?? `Meeting ${m.id}`}
                  </option>
                ))}
              </select>
            ) : null}
            {row.meeting_id ? (
              <button type="button" className="btn btn-sm" onClick={() => setDecisionFormBId(row.form_b_id)}>
                Record decision
              </button>
            ) : null}
            {row.meeting_id &&
            !row.protocol_number &&
            row.decision &&
            APPROVED_DECISIONS.includes(row.decision) ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void handleGenerateProtocol(row.form_b_id)}
              >
                Generate protocol
              </button>
            ) : null}
            {row.meeting_id && row.protocol_number && row.decision && APPROVED_DECISIONS.includes(row.decision) ? (
              <button
                type="button"
                className="btn btn-sm"
                disabled={sendingInvitationId === row.form_b_id}
                onClick={() => void handleSendInvitation(row.form_b_id)}
              >
                {sendingInvitationId === row.form_b_id ? "Sending…" : "Send invitation"}
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [meetings, sendingInvitationId],
  );

  const decisionRow = formBRows.find((row) => row.form_b_id === decisionFormBId) ?? null;

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>IAEC Dashboard</h2>
        <p>Assign Form B submissions to meetings, record decisions, generate protocol numbers, and send invitations.</p>
      </header>

      {loading && <p>Loading…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <>
          <section className="dashboard-section">
            <div className="section-toolbar">
              <h3>Form B records</h3>
              <button type="button" className="btn" onClick={() => navigate("/iaec/meetings/new")}>
                + New meeting
              </button>
            </div>
            <DataTable columns={columns} rows={formBRows} emptyText="No Form B records found." />
          </section>

          {decisionRow ? (
            <section className="dashboard-section dashboard-card">
              <h3>Record decision — Form B #{decisionRow.form_b_id}</h3>
              <div className="form-grid">
                <label>
                  Decision
                  <select
                    value={decisionValue}
                    onChange={(e) => setDecisionValue(e.target.value as FormBMeetingDecisionValue)}
                  >
                    <option value="approved">Approved</option>
                    <option value="approved_with_revisions">Approved with revisions</option>
                    <option value="rejected">Rejected</option>
                    <option value="animal_count_amended">Animal count amended</option>
                  </select>
                </label>
                {decisionValue === "animal_count_amended" ? (
                  <label>
                    Approved animal count
                    <input
                      type="number"
                      min={1}
                      value={approvedAnimalCount}
                      onChange={(e) => setApprovedAnimalCount(e.target.value)}
                    />
                  </label>
                ) : null}
                <label className="full-width">
                  Remarks
                  <textarea
                    rows={3}
                    value={decisionRemarks}
                    onChange={(e) => setDecisionRemarks(e.target.value)}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => void handleSaveDecision(decisionRow)}>
                  Save decision
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setDecisionFormBId(null)}>
                  Cancel
                </button>
              </div>
            </section>
          ) : null}

          <section className="dashboard-section">
            <h3>IAEC meetings</h3>
            {meetings.length === 0 ? (
              <p>No meetings yet.</p>
            ) : (
              meetings.map((m) => (
                <div key={m.id} className="dashboard-card">
                  <p>
                    <strong>Meeting #{m.meeting_number ?? m.id}</strong> — {formatDisplayDate(m.date)}
                  </p>
                  <div className="table-actions">
                    <button type="button" className="btn btn-sm" onClick={() => navigate(`/iaec/meetings/${m.id}`)}>
                      View meeting
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      disabled={downloadingMeetingId === m.id}
                      onClick={() =>
                        void handleDownloadMeetingSummary(
                          m.id,
                          String(m.meeting_number ?? m.id),
                        )
                      }
                    >
                      {downloadingMeetingId === m.id ? "Downloading…" : "Download summary PDF"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
