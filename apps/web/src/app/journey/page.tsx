export default function Journey() {
  return (
    <main className="site">
      <section className="section">
        <div className="eyebrow">Build Journey / Waves 1–5</div>
        <h1>From foundation to production proof.</h1>
        <div className="grid">
          {[1, 2, 3, 4, 5].map((w) => (
            <div className="card" key={w}>
              <h3>Wave {w}</h3>
              <p className="muted">
                PLANNED or historical context only. See the Atlas roadmap for evidence and
                limitations.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
