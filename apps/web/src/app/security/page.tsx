export default function Security() {
  return (
    <main className="site">
      <section className="section">
        <div className="eyebrow">Trust & privacy</div>
        <h1>Evidence without exposure.</h1>
        <p className="lede">
          Phase 0 establishes the security model: provider credentials stay server-side, logs redact
          secrets, access is workspace-scoped, requests are bounded, and plaintext private prompts
          never go onchain.
        </p>
      </section>
    </main>
  );
}
