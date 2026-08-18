import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  variant?: "hero" | "card";
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  variant = "hero",
}: PageHeaderProps) {
  const className =
    variant === "hero" ? "page-header hero-panel hero-panel-wide" : "page-header page-header-card";

  return (
    <section className={className}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="page-header-main">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="page-header-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
    </section>
  );
}
