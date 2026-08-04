import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMeeting } from "../../api/iaecApi";
import { getApiErrorMessage } from "../../api/errors";

export function IaecCreateMeeting() {
  const navigate = useNavigate();

  const [meetingNumber, setMeetingNumber] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [venue, setVenue] = useState("");
  const [minutes, setMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function validateMeeting() {
    if (!meetingNumber.trim()) return "Meeting number is required.";
    if (!meetingDate) return "Meeting date is required.";
    if (!meetingTime.trim()) return "Meeting time is required.";
    if (!venue.trim()) return "Meeting venue is required.";
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
        meeting_time: meetingTime.trim(),
        venue: venue.trim(),
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
        <p>Define meeting number, schedule, and venue for invitation emails.</p>
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
          Meeting Time
          <input
            type="time"
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
          />
        </label>

        <label className="full-width">
          Venue
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g., IAEC Conference Room, L.M. College of Pharmacy"
          />
        </label>

        <label className="full-width">
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
