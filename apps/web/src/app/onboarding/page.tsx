export default function Onboarding() {
  return (
    <main className="hero">
      <div className="eyebrow">Workspace onboarding</div>
      <h1>Make a workspace for your prompts.</h1>
      <p className="lede">
        A personal workspace is created through the Better Auth organization foundation. Workspace
        management and invitations are available from the Studio navigation.
      </p>
      <a className="button primary" href="/app/workspaces/new">
        Create workspace
      </a>
    </main>
  );
}
