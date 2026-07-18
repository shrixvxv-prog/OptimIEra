const modules = [
  'Prompt Analyzer',
  'Intelligence Engine',
  'Candidate Optimizer',
  'Prompt Diff Viewer',
  'Evaluation Lab',
  'Prompt Registry',
  'Optimization Certificates',
  'Proof Center',
];

export default function Home() {
  return (
    <main className="site">
      <header className="nav">
        <a className="brand" href="/">
          <span>OI//</span> OptimIEra
        </a>
        <nav className="links">
          <a href="/product">Product</a>
          <a href="/architecture">Architecture</a>
          <a href="/journey">Journey</a>
          <a href="/security">Trust</a>
          <a href="/app">Studio</a>
        </nav>
      </header>
      <section className="hero pattern">
        <div className="eyebrow">Optim-eye-era / Phase 2 local engine</div>
        <h1>Prompt intelligence you can verify.</h1>
        <p className="lede">
          OptimIEra transforms raw AI instructions into analyzed, scored, optimized, versioned, and
          verifiable prompt assets. The local OptimIEra Rules Engine is active; 0G integrations are
          planned.
        </p>
        <div className="actions">
          <a className="button primary" href="https://docs.optimiera.dev">
            Explore OptimIEra Atlas
          </a>
          <a className="button" href="/app">
            Launch OptimIEra Studio
          </a>
          <a className="button" href="/proofs">
            View Proof Center
          </a>
        </div>
      </section>
      <section className="section">
        <div className="eyebrow">The problem</div>
        <h2>Rewriting is not reliability.</h2>
        <p className="lede">
          A better-sounding prompt is not necessarily a better prompt. OptimIEra makes improvement
          measurable across quality, consistency, safety, privacy, structure, and token efficiency.
        </p>
      </section>
      <section className="section">
        <div className="eyebrow">Optimize / Evaluate / Verify</div>
        <div className="grid">
          <div className="card">
            <h3>01 Analyze</h3>
            <p className="muted">Find ambiguity, missing constraints, contradictions, and risk.</p>
          </div>
          <div className="card">
            <h3>02 Evaluate</h3>
            <p className="muted">
              Compare original and candidate prompts with deterministic scores.
            </p>
          </div>
          <div className="card">
            <h3>03 Version</h3>
            <p className="muted">
              Save selected candidates as immutable encrypted prompt versions.
            </p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="eyebrow">Product system</div>
        <h2>From raw instruction to prompt asset.</h2>
        <div className="grid">
          {modules.map((module) => (
            <div className="card" key={module}>
              <h3>{module}</h3>
              <p className="muted">Local engine active / decentralized proof planned.</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="eyebrow">Why 0G</div>
        <h2>Decentralized infrastructure for evidence.</h2>
        <p className="lede">
          The planned architecture separates compute, encrypted storage, onchain provenance, agent
          identity, and future data availability. No live 0G integration is claimed in this phase.
        </p>
      </section>
      <section className="section">
        <div className="eyebrow">Trust by design</div>
        <h2>Private evidence stays private.</h2>
        <p className="lede">
          OptimIEra encrypts local prompt versions and optimization candidates. Plaintext private
          prompts and private test data must never be written to a public blockchain.
        </p>
      </section>
      <footer className="footer">
        <span>OI// OptimIEra</span>
        <span>Optimize. Evaluate. Verify.</span>
      </footer>
    </main>
  );
}
