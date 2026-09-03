'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

const navigation = [
  ['/app', 'Overview'],
  ['/app/optimize', 'Optimize'],
  ['/app/prompts', 'Prompt Registry'],
  ['/app/evaluations', 'Evaluations'],
  ['/app/benchmarks', 'Benchmarks'],
  ['/app/certificates', 'Certificates'],
  ['/app/workspaces', 'Workspaces'],
  ['/app/team', 'Team'],
  ['/app/usage', 'Usage'],
  ['/app/settings', 'Settings'],
] as const;

function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Studio navigation">
      {navigation.map(([href, label]) => (
        <a href={href} key={href} aria-current={pathname === href ? 'page' : undefined}>
          {label}
        </a>
      ))}
    </nav>
  );
}

export function AppShell({
  children,
  userName,
  workspaces,
  networkName,
  chainId,
  liveWritesEnabled,
}: {
  children: ReactNode;
  userName: string;
  workspaces: Array<{ slug: string; name: string }>;
  networkName: string;
  chainId: number;
  liveWritesEnabled: boolean;
}) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const breadcrumb = pathname
    .split('/')
    .filter(Boolean)
    .slice(1)
    .map((part) => part.replace(/-/g, ' '))
    .join(' / ');

  useEffect(() => {
    const enabled = window.localStorage.getItem('optimiera-theme') === 'dark';
    setDark(enabled);
    document.documentElement.classList.toggle('dark', enabled);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem('optimiera-theme', next ? 'dark' : 'light');
  }

  async function signOut() {
    await authClient.signOut();
    window.location.assign('/sign-in');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="OptimIEra home">
          <span>OI//</span> OptimIEra
        </a>
        <span
          className="status-pill network-badge"
          title={`OptimIEra is configured for ${networkName}. Network-specific balances and records are separate.`}
        >
          {networkName}
        </span>
        <Navigation />
        <div className="sidebar-footer muted">
          <span>{networkName}</span>
          <span>Chain {chainId}</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <details className="mobile-menu">
            <summary aria-label="Open navigation">Menu</summary>
            <div className="mobile-menu-panel">
              <Navigation />
            </div>
          </details>
          <div className="breadcrumb" aria-label="Breadcrumb">
            Studio{breadcrumb ? ` / ${breadcrumb}` : ''}
          </div>
          <div className="topbar-actions">
            {workspaces.length > 0 && (
              <div className="workspace-switcher">
                <select
                  aria-label="Switch workspace"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value)
                      window.location.assign(`/app/workspaces/${event.target.value}`);
                  }}
                >
                  <option value="">Switch workspace</option>
                  {workspaces.map((workspace) => (
                    <option value={workspace.slug} key={workspace.slug}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button className="button compact" type="button" onClick={toggleTheme}>
              {dark ? 'Light theme' : 'Dark theme'}
            </button>
            <details className="profile-menu">
              <summary>{userName}</summary>
              <div className="profile-menu-panel">
                <a href="/account">Profile</a>
                <a href="/account/security">Security</a>
                <button type="button" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </header>
        <div className="global-status" role="status" aria-live="polite">
          {liveWritesEnabled
            ? `Live ${networkName} operations are enabled with bounded quotas. Rules Engine remains local deterministic, and provider failures never silently switch providers.`
            : `Safe ${networkName} mode is active. External model execution and funded 0G writes are disabled.`}
        </div>
        {children}
      </div>
    </div>
  );
}
