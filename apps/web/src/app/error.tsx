'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="site">
          <section className="section">
            <h1>OptimIEra is temporarily unavailable</h1>
            <p>
              Please retry in a moment. No prompt content or credentials are shown in this error.
            </p>
            {error.digest && <p className="mono">Reference: {error.digest}</p>}
            <div className="actions">
              <button className="button primary" type="button" onClick={reset}>
                Try again
              </button>
              <a className="button" href="/">
                Return home
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
