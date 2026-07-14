import type { LookupOption } from "../../api/lookupApi";

interface LookupSelectFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: LookupOption[];
  placeholder: string;
  loading: boolean;
  loadingLabel?: string;
  error?: string | null;
  fieldError?: string;
  disabled?: boolean;
}

export function LookupSelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  loading,
  loadingLabel,
  error,
  fieldError,
  disabled,
}: LookupSelectFieldProps) {
  return (
    <label>
      {label}
      <select
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled || loading || Boolean(error)}
      >
        <option value="">{loading ? (loadingLabel ?? "Loading...") : placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {error ? <small className="field-error">{error}</small> : null}
      {fieldError ? <small className="field-error">{fieldError}</small> : null}
    </label>
  );
}
