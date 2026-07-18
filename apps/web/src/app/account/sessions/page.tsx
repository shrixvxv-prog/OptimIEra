export default function Sessions() {
  return (
    <main className="appmain">
      <div className="eyebrow">Account / Sessions</div>
      <h1>Sessions</h1>
      <div className="card">
        <h3>Session management</h3>
        <p className="muted">
          Persistent sessions are stored server-side. Session listing and revocation UI is reserved
          for the next auth-surface pass.
        </p>
      </div>
    </main>
  );
}
