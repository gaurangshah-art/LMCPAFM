interface DraftRestoreBannerProps {
  onRestore: () => void;
  onDismiss: () => void;
}

export function DraftRestoreBanner({ onRestore, onDismiss }: DraftRestoreBannerProps) {
  return (
    <div className="notice-banner warning-banner" role="status">
      <p>
        Unsaved work from your previous session is available on this step. Restore it, or discard
        to keep the last saved server draft.
      </p>
      <div className="table-actions">
        <button type="button" className="btn btn-sm" onClick={onRestore}>
          Restore unsaved work
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onDismiss}>
          Discard
        </button>
      </div>
    </div>
  );
}
