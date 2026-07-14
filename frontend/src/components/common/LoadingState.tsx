interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div className="loading-state" aria-live="polite" aria-busy="true">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}
