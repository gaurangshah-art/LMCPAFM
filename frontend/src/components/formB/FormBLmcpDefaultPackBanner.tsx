interface FormBLmcpDefaultPackBannerProps {
  description: string;
  applying?: boolean;
  onApply: () => void | Promise<void>;
}

export function FormBLmcpDefaultPackBanner({
  description,
  applying = false,
  onApply,
}: FormBLmcpDefaultPackBannerProps) {
  return (
    <section className="page-section nested-section" aria-label="LMCP default pack">
      <h3>LMCP default pack</h3>
      <p className="field-help">{description}</p>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={applying}
        onClick={() => void onApply()}
      >
        {applying ? "Applying…" : "Apply LMCP defaults (fill blank fields only)"}
      </button>
    </section>
  );
}
