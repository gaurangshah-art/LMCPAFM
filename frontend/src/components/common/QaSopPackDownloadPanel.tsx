import { useState } from "react";
import { downloadQaPackPdf } from "../../api/resourcesApi";
import { getApiErrorMessage } from "../../api/errors";

export function QaSopPackDownloadPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handlePdf() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { blob, filename } = await downloadQaPackPdf();
      await saveBlob(blob, filename);
      setMessage(
        `Downloaded ${filename}. This file is already a PDF. Share it only on college-restricted storage.`,
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-card resources-qa-download-panel">
      <h2>Share SOPs with QA (download)</h2>
      <p className="muted-text">
        Download the full guide as a PDF. Send it on <strong>college-restricted</strong> storage
        only (@lmcp.ac.in SharePoint/Drive, not public links).
      </p>
      <div className="wizard-actions">
        <button type="button" className="btn" disabled={loading} onClick={() => void handlePdf()}>
          {loading ? "Preparing PDF…" : "Download QA pack (PDF)"}
        </button>
      </div>
      <p className="field-help">
        The PDF includes the test steps, the printable checklist, and the role SOPs. Open it in
        any PDF reader. No conversion is required.
      </p>
      {message ? <p className="muted-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
