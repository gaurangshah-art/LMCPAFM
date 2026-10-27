import type { FormEvent } from "react";
import { useState } from "react";
import type { User } from "../../api/types";
import { ErrorAlert } from "../common/ErrorAlert";

interface AdminResetPasswordFormProps {
  user: User;
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSave: (userId: number, newPassword: string) => Promise<void>;
}

export function AdminResetPasswordForm({
  user,
  isSaving,
  errorMessage,
  onCancel,
  onSave,
}: AdminResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    await onSave(user.id, newPassword);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-panel"
        role="dialog"
        aria-labelledby="reset-user-password-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3 id="reset-user-password-title">Reset password</h3>
            <p>
              {user.name} · {user.email}
            </p>
          </div>
          <button type="button" className="btn-secondary btn-small" onClick={onCancel}>
            Close
          </button>
        </header>

        <form className="modal-body form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <p className="full-width admin-form-note">
            Set a new temporary password. The user should change it after logging in via{" "}
            <strong>Password</strong> in the navigation menu.
          </p>

          <label className="full-width">
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isSaving}
            />
          </label>

          <label className="full-width">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSaving}
            />
          </label>

          {localError ? <ErrorAlert message={localError} /> : null}
          {errorMessage ? <ErrorAlert message={errorMessage} /> : null}

          <div className="modal-actions full-width">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={isSaving}>
              {isSaving ? "Saving..." : "Reset password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
