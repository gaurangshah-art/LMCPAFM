import { useEffect, useState } from "react";
import {
  copyFormBFromSource,
  getFormBCopySources,
  storeFormBId,
  type FormBCopySource,
} from "../../api/formbApi";
import { getApiErrorMessage } from "../../api/errors";
import { getStoredUserId } from "../../auth/session";
import { formatDisplayDate } from "../../utils/dateFormat";

interface FormBCopyDialogProps {
  open: boolean;
  onClose: () => void;
  onCopied: (formBId: number, notice: string) => void;
}

export function FormBCopyDialog({ open, onClose, onCopied }: FormBCopyDialogProps) {
  const [sources, setSources] = useState<FormBCopySource[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedId("");
    setLoading(true);
    getFormBCopySources()
      .then((rows) => {
        setSources(rows);
        if (rows.length === 1) {
          setSelectedId(rows[0].form_b_id);
        }
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  async function handleCopy() {
    if (selectedId === "") return;
    setCopying(true);
    setError(null);
    try {
      const result = await copyFormBFromSource(selectedId);
      storeFormBId(result.id, getStoredUserId());
      const protocol = result.source_protocol_number ?? `#${result.source_form_b_id}`;
      onCopied(
        result.id,
        `Copied protocol ${protocol} into a new draft (Form B ${result.id}). ` +
          "Re-upload funding proof and any certificates; attachments are not copied automatically.",
      );
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-b-copy-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h3 id="form-b-copy-title">Copy previous Form B</h3>
          <p>
            Start a renewal or amendment draft from a submitted or approved protocol you were on.
            Steps 1–7 and the study plan copy over; funding proof and file attachments do not.
          </p>
        </header>

        {loading ? <p>Loading your protocols…</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && sources.length === 0 ? (
          <p className="muted-text">
            No copyable protocols yet. Submit a Form B or wait for IAEC approval, then try again.
          </p>
        ) : null}

        {!loading && sources.length > 0 ? (
          <label className="full-width modal-body">
            Select protocol to copy
            <select
              value={selectedId === "" ? "" : String(selectedId)}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Choose a protocol</option>
              {sources.map((row) => (
                <option key={row.form_b_id} value={String(row.form_b_id)}>
                  {row.protocol_number ? `${row.protocol_number} — ` : ""}
                  {row.title}
                  {row.submitted_at
                    ? ` (submitted ${formatDisplayDate(row.submitted_at)})`
                    : row.status
                      ? ` (${row.status})`
                      : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={copying}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void handleCopy()}
            disabled={copying || selectedId === "" || loading}
          >
            {copying ? "Copying…" : "Create draft from copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
