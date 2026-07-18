export default function Workspaces() {
  return (
    <main className="appmain">
      <div className="eyebrow">Workspace directory</div>
      <h1>Your workspaces</h1>
      <div className="card">
        <h3>Personal workspace</h3>
        <p className="muted">
          Active workspace membership is validated on the server for protected operations.
        </p>
        <a className="button" href="/app/workspaces/new">
          New workspace
        </a>
      </div>
    </main>
  );
}
