interface DraftRestoreBannerProps {
  onRestore: () => void;
  onDismiss: () => void;
  detail?: string;
}

export function DraftRestoreBanner({ onRestore, onDismiss, detail }: DraftRestoreBannerProps) {
  return (
    <div className="notice-banner warning-banner" role="status">
      <p>
        {detail ??
          "Unsaved work from a previous visit is available on this step. Restore it, or discard to keep the last version saved on the server."}
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
