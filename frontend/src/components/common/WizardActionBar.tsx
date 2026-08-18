import type { LegacyRef, ReactNode } from "react";

interface WizardActionBarProps {
  children: ReactNode;
  validationError?: string | null;
  actionRef?: LegacyRef<HTMLDivElement>;
  className?: string;
}

export function WizardActionBar({
  children,
  validationError,
  actionRef,
  className,
}: WizardActionBarProps) {
  return (
    <div ref={actionRef} className={className ? `wizard-actions ${className}` : "wizard-actions"}>
      {validationError ? (
        <p className="error-text wizard-validation-error full-width" role="alert">
          {validationError}
        </p>
      ) : null}
      {children}
    </div>
  );
}
