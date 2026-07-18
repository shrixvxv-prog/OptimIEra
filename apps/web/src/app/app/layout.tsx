import type { ReactNode } from 'react';

const items = [
  ['/app', 'Overview'],
  ['/app/optimize', 'Optimize'],
  ['/app/prompts', 'Prompts'],
  ['/app/evaluations', 'Evaluations'],
  ['/app/certificates', 'Certificates'],
  ['/app/team', 'Team'],
  ['/app/api-keys', 'API keys'],
  ['/app/usage', 'Usage'],
  ['/app/settings', 'Settings'],
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span>OI//</span> OptimIEra
        </a>
        <span className="status-pill">PHASE 2</span>
        <nav>
          {items.map(([href, label]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
        <div style={{ marginTop: 'auto' }} className="muted">
          Docs / Rules Engine active
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>Workspace / Personal placeholder</span>
          <span className="mono">environment: local / provider: rules</span>
        </header>
        {children}
      </div>
    </div>
  );
}
