import type { ReactNode } from "react";

interface PageSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function PageSection({ title, subtitle, children }: PageSectionProps) {
  return (
    <section className="page-card">
      <header className="section-header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
