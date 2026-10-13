import type { ReactNode } from "react";

interface SectionPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Standard page heading for form and detail views. */
export function SectionPageHeader({ title, subtitle, actions }: SectionPageHeaderProps) {
  return (
    <header className="section-header">
      <div className="page-header-main">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
