import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export function IaecCreateMeeting() {
  const navigate = useNavigate();

  const [meetingYear, setMeetingYear] = useState("");
  const [meetingNumber, setMeetingNumber] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [loading, setLoading] = useState(false);

  function validateMeeting() {
    if (!meetingYear) return "Meeting year is required.";
    if (!meetingNumber.trim()) return "Meeting number is required.";
    if (!meetingDate) return "Meeting date is required.";
    return null;
  }

  async function handleCreate() {
    const error = validateMeeting();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    try {
      await api.post("/iaec/meetings", {
        meeting_year: Number(meetingYear),
        meeting_number: Number(meetingNumber),
        meeting_date: meetingDate,
      });

      alert("Meeting created successfully.");
      navigate("/iaec/dashboard");
    } catch {
      alert("Failed to create meeting.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Create IAEC Meeting</h2>
        <p>Define meeting year, number, and date.</p>
      </header>

      <div className="form-grid">

        <label>
          Meeting Year
          <select
            value={meetingYear}
            onChange={(e) => setMeetingYear(e.target.value)}
          >
            <option value="">Select year</option>
            {Array.from({ length: 5 }).map((_, i) => {
              const year = new Date().getFullYear() + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </label>

        <label>
          Meeting Number
          <input
            type="number"
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

      </div>

      <div className="wizard-actions">
        <button className="btn-secondary" onClick={() => navigate("/iaec/dashboard")}>
          ← Back
        </button>

        <button className="btn" onClick={handleCreate} disabled={loading}>
          Create Meeting →
        </button>
      </div>
    </div>
  );
}
