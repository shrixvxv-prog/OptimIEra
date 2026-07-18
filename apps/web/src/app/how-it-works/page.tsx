export default function HowItWorks() {
  return (
    <main className="site">
      <section className="section">
        <div className="eyebrow">Core workflow</div>
        <h1>Optimize. Evaluate. Verify.</h1>
        <div className="grid">
          <div className="card">
            <h3>Raw prompt</h3>
            <p className="muted">A versioned input enters the intelligence pipeline.</p>
          </div>
          <div className="card">
            <h3>Measured candidates</h3>
            <p className="muted">Candidates are evaluated against a test suite.</p>
          </div>
          <div className="card">
            <h3>Public proof</h3>
            <p className="muted">
              A future certificate links hashes, evidence, ownership, and provenance.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
