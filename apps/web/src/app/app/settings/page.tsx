import { readOGStorageConfig } from '@optimiera/config';
import { OGStorageAdapter } from '@optimiera/og-storage';

export default async function Settings() {
  const health = await new OGStorageAdapter(readOGStorageConfig()).healthCheck();
  return (
    <main className="appmain">
      <div className="eyebrow">Settings</div>
      <h1>Workspace settings</h1>
      <div className="card">
        <h3>0G Storage</h3>
        <p>0G Storage — {health.state}</p>
        <p className="muted">
          Network: {health.network} · Mode: {health.mode} · RPC: {health.rpcHost} · Indexer:{' '}
          {health.indexerHost}
        </p>
        <p className="muted">
          Signer status: {health.signerConfigured ? 'configured on server' : 'unconfigured'}
        </p>
      </div>
      <div className="card">
        <h3>Local foundation</h3>
        <p className="muted">
          Theme switcher, workspace selector, connection status, and environment indicator are shell
          placeholders.
        </p>
      </div>
    </main>
  );
}
