import type { FormEvent } from "react";
import { useState } from "react";
import type { User } from "../../api/types";
import {
  assignableRolesFromUser,
  type AssignableAdminRole,
  userHasInvestigatorRole,
} from "../../constants/adminRoles";
import { ErrorAlert } from "../common/ErrorAlert";
import { AssignableRoleCheckboxes } from "./AssignableRoleCheckboxes";

interface UserRoleEditFormProps {
  user: User;
  currentUserId: number;
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSave: (userId: number, roles: AssignableAdminRole[]) => Promise<void>;
}

export function UserRoleEditForm({
  user,
  currentUserId,
  isSaving,
  errorMessage,
  onCancel,
  onSave,
}: UserRoleEditFormProps) {
  const [selectedRoles, setSelectedRoles] = useState<AssignableAdminRole[]>(
    assignableRolesFromUser(user.roles),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const isInvestigatorAccount = userHasInvestigatorRole(user.roles);
  const isSelf = user.id === currentUserId;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (selectedRoles.length === 0) {
      setLocalError("Select at least one role.");
      return;
    }

    if (isSelf && !selectedRoles.includes("admin")) {
      setLocalError("You cannot remove your own admin access from this screen.");
      return;
    }

    await onSave(user.id, selectedRoles);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-panel"
        role="dialog"
        aria-labelledby="edit-user-roles-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3 id="edit-user-roles-title">Edit User Roles</h3>
            <p>
              {user.name} · {user.email}
            </p>
          </div>
          <button type="button" className="btn-secondary btn-small" onClick={onCancel}>
            Close
          </button>
        </header>

        {isInvestigatorAccount ? (
          <div className="modal-body">
            <p>
              This account includes the <strong>investigator</strong> role from self-registration.
              Role changes for investigators are not supported here.
            </p>
            <p>Current roles: {user.roles.join(", ")}</p>
          </div>
        ) : (
          <form className="modal-body form-grid" onSubmit={(event) => void handleSubmit(event)}>
            <div className="full-width">
              <span className="checkbox-group-label">Assigned roles</span>
              <AssignableRoleCheckboxes
                idPrefix={`edit-user-${user.id}`}
                selectedRoles={selectedRoles}
                onChange={setSelectedRoles}
                disabled={isSaving}
              />
            </div>
            <p className="full-width admin-form-note">
              Status: {user.status ? "Active" : "Inactive"}
            </p>
            {localError ? <ErrorAlert message={localError} /> : null}
            {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
            <div className="modal-actions full-width">
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSaving}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Roles"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
