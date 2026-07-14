export function DashboardPage() {
  return (
    <section className="hero-panel">
      <h1>LMCPAFM Frontend</h1>
      <p>
        Use the navigation above to create and review IAEC projects, requisitions,
        allocations, experiment groups, and experiments.
      </p>
      <div className="info-grid">
        <article>
          <h3>Backend Base URL</h3>
          <p>http://127.0.0.1:8000</p>
        </article>
        <article>
          <h3>Workflow</h3>
          <p>Project {">"} Group {">"} Requisition {">"} Allocation {">"} Experiment</p>
        </article>
      </div>
    </section>
  );
}
