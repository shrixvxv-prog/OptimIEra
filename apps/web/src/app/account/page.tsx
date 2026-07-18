export default function Account() {
  return (
    <main className="appmain">
      <div className="eyebrow">Account</div>
      <h1>Account security</h1>
      <div className="grid">
        <a className="card" href="/account/security">
          <h3>Password & verification</h3>
          <p className="muted">Manage credentials and email verification.</p>
        </a>
        <a className="card" href="/account/sessions">
          <h3>Sessions</h3>
          <p className="muted">Review and revoke active sessions.</p>
        </a>
      </div>
    </main>
  );
}
