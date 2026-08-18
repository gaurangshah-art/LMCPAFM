import {
  ASSIGNABLE_ADMIN_ROLES,
  type AssignableAdminRole,
} from "../../constants/adminRoles";

interface AssignableRoleCheckboxesProps {
  selectedRoles: AssignableAdminRole[];
  onChange: (roles: AssignableAdminRole[]) => void;
  disabled?: boolean;
  idPrefix?: string;
}

export function AssignableRoleCheckboxes({
  selectedRoles,
  onChange,
  disabled = false,
  idPrefix = "role",
}: AssignableRoleCheckboxesProps) {
  function toggleRole(role: AssignableAdminRole, checked: boolean) {
    const nextRoles = checked
      ? Array.from(new Set([...selectedRoles, role]))
      : selectedRoles.filter((value) => value !== role);
    onChange(nextRoles);
  }

  return (
    <div className="checkbox-grid">
      {ASSIGNABLE_ADMIN_ROLES.map((role) => (
        <label key={role} className="checkbox-card" htmlFor={`${idPrefix}-${role}`}>
          <input
            id={`${idPrefix}-${role}`}
            type="checkbox"
            checked={selectedRoles.includes(role)}
            disabled={disabled}
            onChange={(event) => toggleRole(role, event.target.checked)}
          />
          <span>{role}</span>
        </label>
      ))}
    </div>
  );
}
