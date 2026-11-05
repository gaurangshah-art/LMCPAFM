import type { ReactNode } from "react";
import { FormBWizardProgress } from "./FormBWizardProgress";
import type { FormBWizardStepId } from "../../constants/formBWizardProgress";

interface FormBWizardPageHeaderProps {
  stepId: FormBWizardStepId;
  formBId: number | null;
  submitted?: boolean;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function FormBWizardPageHeader({
  stepId,
  formBId,
  submitted,
  title,
  subtitle,
  children,
}: FormBWizardPageHeaderProps) {
  return (
    <>
      <FormBWizardProgress
        currentStepId={stepId}
        formBId={formBId}
        submitted={submitted}
      />
      <header className="section-header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
      </header>
    </>
  );
}
