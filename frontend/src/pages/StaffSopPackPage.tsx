import { useState } from "react";
import { downloadFacilitySopPack } from "../api/facilityApi";
import { getApiErrorMessage } from "../api/errors";

export function StaffSopPackPage() {
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    setMessage(null);
    try {
      const { blob, filename } = await downloadFacilitySopPack();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`Download started: ${filename}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h2>Animal facility SOP pack</h2>
        <p>
          Standard operating procedures for animal house staff and facility coordinators. Markdown
          sources are bundled in one zip for offline reading or PDF export at your college.
        </p>
      </header>

      <ul className="muted-text">
        <li>Daily operations (cleaning, entry, environment logs, cages, feeding, quarantine)</li>
        <li>Equipment register template</li>
        <li>Personnel index and LMCPAFM admin notes for facility setup</li>
        <li>Internal industry source catalog (college internal use)</li>
      </ul>

      <p className="field-help">
        Confidential industry originals are not included. Do not share this pack on public websites.
      </p>

      <div className="wizard-actions">
        <button type="button" className="btn" disabled={downloading} onClick={() => void handleDownload()}>
          {downloading ? "Preparing zip…" : "Download SOP pack (zip)"}
        </button>
      </div>

      {message ? <p className="muted-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
