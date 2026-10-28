import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFormBReview, type FormBReviewData } from "../../api/formbApi";
import {
  computeWizardProgressPercent,
  estimateRemainingMinutes,
  FORM_B_WIZARD_STEPS,
  FORM_B_WIZARD_TOTAL_MINUTES,
  formatMinutesEstimate,
  isWizardStepSaved,
  type FormBWizardStepId,
} from "../../constants/formBWizardProgress";

interface FormBWizardProgressProps {
  currentStepId: FormBWizardStepId;
  formBId: number | null;
  submitted?: boolean;
}

export function FormBWizardProgress({
  currentStepId,
  formBId,
  submitted = false,
}: FormBWizardProgressProps) {
  const [review, setReview] = useState<FormBReviewData | null>(null);

  useEffect(() => {
    if (!formBId || submitted) {
      setReview(null);
      return;
    }
    let cancelled = false;
    getFormBReview(formBId)
      .then((data) => {
        if (!cancelled) setReview(data);
      })
      .catch(() => {
        if (!cancelled) setReview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [formBId, submitted, currentStepId]);

  const currentIndex = FORM_B_WIZARD_STEPS.findIndex((step) => step.id === currentStepId);
  const stepNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
  const stepTotal = FORM_B_WIZARD_STEPS.length;
  const remaining = estimateRemainingMinutes(currentStepId);
  const percent = submitted ? 100 : computeWizardProgressPercent(review);

  return (
    <section className="form-b-wizard-progress" aria-label="Form B wizard progress">
      <div className="form-b-wizard-progress__meta">
        <span>
          Step {stepNumber} of {stepTotal}
          {formBId ? ` · Form B #${formBId}` : ""}
        </span>
        <span>
          {submitted
            ? "Submitted"
            : `${formatMinutesEstimate(remaining)} remaining (typical)`}
          {!submitted ? (
            <span className="form-b-wizard-progress__total muted-text">
              {" "}
              · full wizard {formatMinutesEstimate(FORM_B_WIZARD_TOTAL_MINUTES)}
            </span>
          ) : null}
        </span>
      </div>
      <div
        className="form-b-wizard-progress__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Saved sections"
      >
        <div className="form-b-wizard-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="form-b-wizard-progress__steps">
        {FORM_B_WIZARD_STEPS.map((step) => {
          const isCurrent = step.id === currentStepId;
          const saved = isWizardStepSaved(step, review);
          const chipClass = isCurrent
            ? "form-b-wizard-progress__chip form-b-wizard-progress__chip--current"
            : saved
              ? "form-b-wizard-progress__chip form-b-wizard-progress__chip--done"
              : "form-b-wizard-progress__chip";
          const content = <span className={chipClass}>{step.shortLabel}</span>;
          if (!formBId || submitted || isCurrent) {
            return <span key={step.id}>{content}</span>;
          }
          return (
            <Link key={step.id} to={`${step.route}?formBId=${formBId}`} className="form-b-wizard-progress__link">
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
