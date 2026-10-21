import { useState } from "react";
import { downloadCombinedQaMarkdown, downloadQaSopPackZip } from "../../api/resourcesApi";
import { getApiErrorMessage } from "../../api/errors";

export function QaSopPackDownloadPanel() {
  const [loading, setLoading] = useState<"zip" | "md" | null>(null);
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

  async function handleZip() {
    setLoading("zip");
    setError(null);
    setMessage(null);
    try {
      const { blob, filename } = await downloadQaSopPackZip();
      await saveBlob(blob, filename);
      setMessage(
        `Downloaded ${filename}. Share the zip on college-restricted storage. QA opens .md files in Word → Save as PDF.`,
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleCombinedMd() {
    setLoading("md");
    setError(null);
    setMessage(null);
    try {
      const { blob, filename } = await downloadCombinedQaMarkdown();
      await saveBlob(blob, filename);
      setMessage(
        `Downloaded ${filename}. Open in Microsoft Word, then File → Save As → PDF to share with QA.`,
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="page-card resources-qa-download-panel">
      <h2>Share SOPs with QA (download)</h2>
      <p className="muted-text">
        Use these buttons instead of printing from the browser. Send the file on{" "}
        <strong>college-restricted</strong> storage only (@lmcp.ac.in SharePoint/Drive, not public
        links).
      </p>
      <div className="wizard-actions">
        <button
          type="button"
          className="btn"
          disabled={loading !== null}
          onClick={() => void handleZip()}
        >
          {loading === "zip" ? "Preparing zip…" : "Download QA SOP pack (zip)"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={loading !== null}
          onClick={() => void handleCombinedMd()}
        >
          {loading === "md" ? "Downloading…" : "Download combined pack (.md)"}
        </button>
      </div>
      <p className="field-help">
        The zip includes the full UAT guide, printable checklist, and role SOPs. For PDF: open any{" "}
        <code>.md</code> file in <strong>Word</strong> → Save As → PDF.
      </p>
      {message ? <p className="muted-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
