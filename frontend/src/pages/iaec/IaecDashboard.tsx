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
import { getApiErrorMessage } from "../../api/errors";
import { DataTable, type TableColumn } from "../../components/tables/DataTable";
import { formatDisplayDate } from "../../utils/dateFormat";

const APPROVED_DECISIONS = ["approved", "approved_with_revisions", "animal_count_amended"];

function isApprovedDecision(decision: string | null | undefined): decision is string {
  return Boolean(decision && APPROVED_DECISIONS.includes(decision));
}

export function IaecDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formBRows, setFormBRows] = useState<FormBWithMeeting[]>([]);
  const [meetings, setMeetings] = useState<IAECMeetingRecord[]>([]);
  const [decisionRow, setDecisionRow] = useState<FormBWithMeeting | null>(null);
  const [decisionValue, setDecisionValue] = useState<FormBMeetingDecisionValue>("approved");
  const [approvedAnimalCount, setApprovedAnimalCount] = useState("");
  const [decisionRemarks, setDecisionRemarks] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [sendingInvitationId, setSendingInvitationId] = useState<number | null>(null);
  const [downloadingMeetingId, setDownloadingMeetingId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [forms, meetingRows] = await Promise.all([getFormBWithMeeting(), getMeetings()]);
      setFormBRows(forms);
      setMeetings(meetingRows);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function openDecisionPanel(row: FormBWithMeeting) {
    setDecisionError(null);
    setDecisionRow(row);
    setDecisionValue(
      (row.decision as FormBMeetingDecisionValue | null) ?? "approved",
    );
    setApprovedAnimalCount(
      row.approved_animal_count != null ? String(row.approved_animal_count) : "",
    );
    setDecisionRemarks(row.decision_remarks ?? "");
  }

  function closeDecisionPanel() {
    setDecisionRow(null);
    setDecisionError(null);
    setApprovedAnimalCount("");
    setDecisionRemarks("");
  }

  async function handleAssignMeeting(row: FormBWithMeeting, meetingId: string) {
    if (!meetingId) return;
    try {
      await assignFormBMeeting(row.form_b_id, Number(meetingId));
      await loadDashboard();
    } catch (err) {
      alert(getApiErrorMessage(err));
    }
  }

  async function handleGenerateProtocol(formBId: number) {
    if (!window.confirm("Generate LMCP/IAEC protocol number for this approved Form B?")) return;
    try {
      const result = await generateFormBProtocolNumber(formBId);
      alert(`Protocol number generated: ${result.protocol_number}`);
      await loadDashboard();
    } catch (err) {
      alert(getApiErrorMessage(err));
    }
  }

  async function handleSendInvitation(formBId: number) {
    if (!window.confirm("Send meeting invitation email to the principal investigator?")) return;

    setSendingInvitationId(formBId);
    try {
      await sendFormBMeetingInvitation(formBId);
      alert("Meeting invitation queued for delivery.");
    } catch (err) {
      alert(getApiErrorMessage(err));
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
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setDownloadingMeetingId(null);
    }
  }

  async function handleSaveDecision() {
    if (!decisionRow || decisionRow.meeting_id == null) return;

    if (decisionValue === "animal_count_amended") {
      const count = Number(approvedAnimalCount);
      if (!Number.isFinite(count) || count <= 0) {
        setDecisionError("Enter a valid approved animal count.");
        return;
      }
    }

    setIsSavingDecision(true);
    setDecisionError(null);
    try {
      await upsertFormBMeetingDecision(decisionRow.form_b_id, {
        meeting_id: decisionRow.meeting_id,
        decision: decisionValue,
        approved_animal_count:
          decisionValue === "animal_count_amended" ? Number(approvedAnimalCount) : null,
        remarks: decisionRemarks.trim() || null,
      });
      closeDecisionPanel();
      await loadDashboard();
    } catch (err) {
      setDecisionError(getApiErrorMessage(err));
    } finally {
      setIsSavingDecision(false);
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
              <button type="button" className="btn btn-sm" onClick={() => openDecisionPanel(row)}>
                {row.decision ? "Edit decision" : "Record decision"}
              </button>
            ) : null}
            {row.meeting_id && !row.protocol_number && isApprovedDecision(row.decision) ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void handleGenerateProtocol(row.form_b_id)}
              >
                Generate protocol
              </button>
            ) : null}
            {row.meeting_id && row.protocol_number && isApprovedDecision(row.decision) ? (
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

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>IAEC Dashboard</h2>
        <p>
          Assign Form B submissions to meetings, record decisions, generate protocol numbers, and
          send invitations.
        </p>
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
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => navigate(`/iaec/meetings/${m.id}`)}
                    >
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

      {decisionRow ? (
        <div className="modal-overlay" onClick={closeDecisionPanel}>
          <div
            className="modal-panel"
            role="dialog"
            aria-labelledby="record-decision-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <h3 id="record-decision-title">
                  {decisionRow.decision ? "Edit decision" : "Record decision"} — Form B #
                  {decisionRow.form_b_id}
                </h3>
                <p>
                  {decisionRow.project_title} · Meeting{" "}
                  {decisionRow.meeting_number ?? decisionRow.meeting_id}
                </p>
              </div>
              <button type="button" className="btn-secondary btn-small" onClick={closeDecisionPanel}>
                Close
              </button>
            </header>

            <div className="modal-body form-grid">
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
              {decisionError ? (
                <p className="error-text full-width">{decisionError}</p>
              ) : null}
              <div className="modal-actions full-width">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeDecisionPanel}
                  disabled={isSavingDecision}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void handleSaveDecision()}
                  disabled={isSavingDecision}
                >
                  {isSavingDecision ? "Saving…" : "Save decision"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
