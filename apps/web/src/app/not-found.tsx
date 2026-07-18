export default function NotFound() {
  return (
    <main className="site">
      <section className="section">
        <div className="eyebrow">404</div>
        <h1>Page not found</h1>
        <p className="lede">
          The requested OptimIEra page does not exist or is not available to this account.
        </p>
        <div className="actions">
          <a className="button primary" href="/">
            Return home
          </a>
          <a className="button" href="/proofs">
            Open Proof Center
          </a>
        </div>
      </section>
    </main>
  );
}
