export default function Security() {
  return (
    <main className="site">
      <section className="section">
        <div className="eyebrow">Trust & privacy</div>
        <h1>Evidence without exposure.</h1>
        <p className="lede">
          Provider credentials stay server-side, logs redact secrets, access is workspace-scoped,
          live testnet requests are bounded by database-backed daily quotas, and plaintext private
          prompts never go onchain.
        </p>
        <div className="grid">
          <article className="card">
            <h2>Encrypted by default</h2>
            <p>Prompt versions, candidates, and evidence payloads use authenticated encryption.</p>
          </article>
          <article className="card">
            <h2>Public proof, private content</h2>
            <p>Certificates expose hashes and provenance metadata—not confidential prompt text.</p>
          </article>
          <article className="card">
            <h2>Testnet safety</h2>
            <p>Production rejects 0G mainnet configuration and keeps live writes off by default.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
