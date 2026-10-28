import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../api/errors";
import {
  deleteFormBAttachment,
  downloadFormBAttachment,
  listFormBAttachments,
  uploadFormBAttachment,
  type FormBAttachmentCategory,
  type FormBAttachmentRecord,
} from "../../api/formbApi";

interface FormBAttachmentFieldProps {
  formBId: number;
  category: FormBAttachmentCategory;
  label: string;
  helpText?: string;
  required?: boolean;
}

export function FormBAttachmentField({
  formBId,
  category,
  label,
  helpText,
  required = false,
}: FormBAttachmentFieldProps) {
  const [attachment, setAttachment] = useState<FormBAttachmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const rows = await listFormBAttachments(formBId);
      setAttachment(rows.find((row) => row.category === category) ?? null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [formBId, category]);

  async function handleUpload(file: File | null) {
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    try {
      const saved = await uploadFormBAttachment(formBId, category, file);
      setAttachment(saved);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!attachment) return;
    if (!window.confirm(`Remove ${attachment.original_filename}?`)) return;

    setUploading(true);
    setErrorMessage(null);
    try {
      await deleteFormBAttachment(formBId, attachment.id);
      setAttachment(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="full-width attachment-field">
      <label>
        {label}
        {required ? " *" : ""}
        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          disabled={uploading}
          onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
        />
      </label>
      {helpText ? <small>{helpText}</small> : null}
      {loading ? <small>Loading attachment...</small> : null}
      {attachment ? (
        <div className="attachment-actions">
          <span>{attachment.original_filename}</span>
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() => void downloadFormBAttachment(formBId, attachment.id, attachment.original_filename)}
          >
            Download
          </button>
          <button
            type="button"
            className="btn-danger btn-small"
            onClick={() => void handleDelete()}
            disabled={uploading}
          >
            Remove
          </button>
        </div>
      ) : (
        <small>No file uploaded yet.</small>
      )}
      {errorMessage ? <small className="field-error">{errorMessage}</small> : null}
    </div>
  );
}

export async function formBHasAttachment(formBId: number, category: FormBAttachmentCategory) {
  const rows = await listFormBAttachments(formBId);
  return rows.some((row) => row.category === category);
}
