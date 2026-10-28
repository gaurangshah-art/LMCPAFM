import { Link } from "react-router-dom";

export function ResourcesEntryPanel() {
  return (
    <section className="page-card resources-entry-panel" aria-labelledby="resources-entry-heading">
      <div className="resources-entry-panel__body">
        <div>
          <p className="eyebrow">Ready reference</p>
          <h2 id="resources-entry-heading">SOPs &amp; user guides</h2>
          <p className="muted-text">
            Role-based standard operating procedures, Form B manual, and UAT checklists — read
            inside LMCPAFM (college internal use).
          </p>
        </div>
        <Link to="/resources" className="btn">
          Open guides
        </Link>
      </div>
    </section>
  );
}
