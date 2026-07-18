const modes = [
  ['Balanced', 'Improves clarity, structure, safety, and efficiency together.'],
  ['Accuracy Focused', 'Prioritizes precise constraints, context, and reliable outputs.'],
  ['Token Efficient', 'Removes waste while preserving intent and required details.'],
];

const infrastructure = [
  ['0G Compute', 'Optional model-assisted optimization through the testnet Router.'],
  ['0G Storage', 'Encrypted evidence manifests with independently verifiable roots.'],
  ['0G Chain', 'Hash-only provenance commitments on the Galileo registry.'],
  ['Public certificates', 'Shareable verification without revealing private prompt text.'],
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
        <span
          className="status-pill testnet-badge"
          title="OptimIEra currently operates on the 0G Galileo testnet. Testnet records have no mainnet financial value."
        >
          0G Galileo Testnet
        </span>
      </header>
      <section className="hero pattern">
        <div className="eyebrow">Privacy-first prompt intelligence</div>
        <h1>Prompt intelligence you can verify.</h1>
        <p className="lede">
          Turn fragile AI instructions into analyzed, scored, optimized, encrypted, and verifiable
          prompt assets—without publishing the prompt itself.
        </p>
        <div className="actions">
          <a className="button primary" href="/app/optimize">
            Start optimizing
          </a>
          <a className="button" href="/verify/cert_1343d8825f8905d881361fa39d7e2a1e">
            View live proof
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
        <div className="eyebrow">How it works</div>
        <h2>From raw instruction to immutable evidence.</h2>
        <div className="grid">
          <div className="card">
            <h3>01 Analyze</h3>
            <p className="muted">Find ambiguity, missing constraints, contradictions, and risk.</p>
          </div>
          <div className="card">
            <h3>02 Optimize</h3>
            <p className="muted">
              Generate Balanced, Accuracy Focused, and Token Efficient candidates.
            </p>
          </div>
          <div className="card">
            <h3>03 Verify</h3>
            <p className="muted">
              Save an immutable version and issue encrypted evidence and a public certificate.
            </p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="eyebrow">Three optimization modes</div>
        <h2>Choose what better means.</h2>
        <div className="grid">
          {modes.map(([name, description]) => (
            <div className="card" key={name}>
              <h3>{name}</h3>
              <p className="muted">{description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="eyebrow">Why 0G</div>
        <h2>Evidence that does not ask for blind trust.</h2>
        <div className="grid">
          {infrastructure.map(([name, description]) => (
            <div className="card" key={name}>
              <h3>{name}</h3>
              <p className="muted">{description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="eyebrow">Trust by design</div>
        <h2>Private evidence stays private.</h2>
        <p className="lede">
          OptimIEra encrypts local prompt versions and optimization candidates. Plaintext private
          prompts never appear in public certificates, Storage metadata, or onchain commitments.
        </p>
        <div className="actions">
          <a className="button primary" href="/app">
            Open Studio
          </a>
          <a className="button" href="/proofs">
            Open Proof Center
          </a>
          <a className="button" href="https://docs.optimiera.dev">
            Read the Atlas
          </a>
        </div>
      </section>
      <footer className="footer">
        <span>OI// OptimIEra</span>
        <span>Optimize. Evaluate. Verify.</span>
      </footer>
    </main>
  );
}
