import { Link } from "react-router-dom";
import type { ExperimentPlanningStatus } from "../../api/types";

interface ExperimentGroupPlanningGuideProps {
  planning: ExperimentPlanningStatus;
  formBId?: number | null;
  onDownloadAnnexure?: () => void;
  annexureDownloading?: boolean;
}

export function ExperimentGroupPlanningGuide({
  planning,
  formBId,
  onDownloadAnnexure,
  annexureDownloading = false,
}: ExperimentGroupPlanningGuideProps) {
  const showAnnexureIaecMismatch = Boolean(planning.annexure_differs_from_iaec);
  const showPlannedCapWarning = Boolean(planning.planned_exceeds_iaec_cap);
  const showPlannedAnnexureNote = Boolean(planning.planned_differs_from_annexure);
  const capLabel = planning.iaec_approval_finalized
    ? "IAEC-approved limit"
    : planning.animal_cap_source === "meeting_decision"
      ? "IAEC decision limit (approval pending)"
      : planning.animal_cap_source === "form_b_requirements"
        ? "Proposed total (Form B)"
        : "Animal limit";
  const remainingLabel = planning.iaec_approval_finalized
    ? "Remaining capacity"
    : "Remaining (after decision)";

  return (
    <div className="info-card">
      <h3>Why experiment groups?</h3>
      <p>
        When IAEC approves your project, groups are copied from your submitted Form B study plan
        (Annexure I) as a <strong>starting point</strong>. Your task is to confirm or adjust them
        here so they match <strong>IAEC-approved instructions</strong> — for example, reduced
        animal numbers, merged arms, or removed phases.
      </p>
      <ul className="plain-list">
        <li>
          <strong>Requisition:</strong> blocked until groups are planned within the IAEC-approved
          animal limit.
        </li>
        <li>
          <strong>Allocation:</strong> staff (or you) assign animals to each group before logging.
        </li>
        <li>
          <strong>Experiment logs:</strong> every entry is recorded against a group; these records
          feed Form D usage and the final project certificate.
        </li>
      </ul>

      <div className="planning-compare-grid">
        <div className="planning-compare-card">
          <span className="planning-compare-label">Annexure I total (submitted)</span>
          <strong>{planning.annexure_i_total ?? "—"}</strong>
        </div>
        <div className="planning-compare-card">
          <span className="planning-compare-label">{capLabel}</span>
          <strong>{planning.approved_animal_count ?? "—"}</strong>
        </div>
        <div className="planning-compare-card">
          <span className="planning-compare-label">Planned in workspace</span>
          <strong>{planning.planned_animal_total}</strong>
        </div>
        <div className="planning-compare-card">
          <span className="planning-compare-label">{remainingLabel}</span>
          <strong>{planning.remaining_animals ?? "—"}</strong>
        </div>
      </div>

      {showAnnexureIaecMismatch ? (
        <p className="auth-note" role="note">
          {planning.iaec_approval_finalized ? (
            <>
              The IAEC-approved animal limit differs from your submitted Annexure I total. Update
              group planned counts here to reflect IAEC instructions — do not edit the submitted Form B.
            </>
          ) : (
            <>
              IAEC has recorded a decision that differs from your submitted Annexure I total. Group
              planning will unlock once IAEC finalizes protocol approval.
            </>
          )}
        </p>
      ) : null}

      {showPlannedCapWarning ? (
        <p className="error-text" role="alert">
          Planned animals exceed the IAEC-approved limit. Reduce group counts before requesting
          animals.
        </p>
      ) : null}

      {showPlannedAnnexureNote && !showPlannedCapWarning ? (
        <p className="auth-note" role="note">
          Planned totals differ from Annexure I. This is expected when IAEC requested changes —
          confirm the workspace matches your approval letter.
        </p>
      ) : null}

      <div className="wizard-actions">
        {formBId ? (
          <>
            <Link className="btn btn-secondary btn-small" to={`/form-b/view?formBId=${formBId}`}>
              View submitted Form B
            </Link>
            {onDownloadAnnexure ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={onDownloadAnnexure}
                disabled={annexureDownloading}
              >
                {annexureDownloading ? "Downloading…" : "Download Annexure I PDF"}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
