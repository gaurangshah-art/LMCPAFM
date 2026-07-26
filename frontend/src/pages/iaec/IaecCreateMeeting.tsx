import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMeeting } from "../../api/iaecApi";
import { getApiErrorMessage } from "../../api/errors";

export function IaecCreateMeeting() {
  const navigate = useNavigate();

  const [meetingNumber, setMeetingNumber] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [minutes, setMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function validateMeeting() {
    if (!meetingNumber.trim()) return "Meeting number is required.";
    if (!meetingDate) return "Meeting date is required.";
    return null;
  }

  async function handleCreate() {
    const error = validateMeeting();
    if (error) {
      setErrorMessage(error);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await createMeeting({
        date: meetingDate,
        meeting_number: meetingNumber.trim(),
        minutes,
      });
      navigate("/iaec-dashboard");
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Create IAEC Meeting</h2>
        <p>Define meeting number and date.</p>
      </header>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <div className="form-grid">
        <label>
          Meeting Number
          <input
            type="text"
            value={meetingNumber}
            onChange={(e) => setMeetingNumber(e.target.value)}
            placeholder="e.g., 8"
          />
        </label>

        <label>
          Meeting Date
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
          />
        </label>

        <label>
          Minutes
          <textarea
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            rows={4}
          />
        </label>
      </div>

      <div className="wizard-actions">
        <button type="button" className="btn-secondary" onClick={() => navigate("/iaec-dashboard")}>
          Back
        </button>

        <button type="button" className="btn" onClick={() => void handleCreate()} disabled={loading}>
          {loading ? "Creating..." : "Create Meeting"}
        </button>
      </div>
    </div>
  );
}
