import {
  readNousConfig,
  readOGChainConfig,
  readOGComputeConfig,
  readOGStorageConfig,
} from '@optimiera/config';
import { NousPromptIntelligenceProvider, OGComputeRouterProvider } from '@optimiera/og-compute';
import { OGStorageAdapter } from '@optimiera/og-storage';
import { getChainHealth } from '@/lib/chain-proof';
import { readWave2RuntimeConfig } from '@/lib/runtime-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Settings() {
  const computeConfig = readOGComputeConfig();
  const nousConfig = readNousConfig();
  const storageConfig = readOGStorageConfig();
  const chainConfig = readOGChainConfig();
  const [compute, nous, storage, chain] = await Promise.all([
    new OGComputeRouterProvider(computeConfig).healthCheck(),
    new NousPromptIntelligenceProvider(nousConfig).healthCheck(),
    new OGStorageAdapter(storageConfig).healthCheck(),
    getChainHealth(),
  ]);
  const runtimeConfig = readWave2RuntimeConfig();
  return (
    <main className="appmain">
      <div className="eyebrow">Settings</div>
      <h1>Security and integrations</h1>
      <div className="grid">
        <a className="card" href="/account">
          <h2>Profile</h2>
          <p className="muted">Account identity and profile details.</p>
        </a>
        <a className="card" href="/app/workspaces">
          <h2>Workspace</h2>
          <p className="muted">Projects, members, roles, and audit history.</p>
        </a>
        <a className="card" href="/account/security">
          <h2>Security</h2>
          <p className="muted">Password, wallet authentication, and active sessions.</p>
        </a>
        <article className="card">
          <h2>Privacy</h2>
          <p>Encrypted prompt storage</p>
          <p className="muted">AES-256-GCM · plaintext excluded from public evidence</p>
        </article>
        <article className="card">
          <h2>Appearance</h2>
          <p className="muted">Use the theme control in the application header.</p>
        </article>
      </div>
      <h2>Integration status</h2>
      <div className="grid">
        <article className="card">
          <h3>0G Compute</h3>
          <p>
            <strong>{compute.state}</strong>
          </p>
          <p className="muted">
            {compute.network} · {compute.model ?? 'No model selected'}
          </p>
        </article>
        <article className="card">
          <h3>Nous prompt intelligence</h3>
          <p>
            <strong>{nous.state}</strong>
          </p>
          <p className="muted">{nous.model ?? 'No model selected'} · server-side credential only</p>
        </article>
        <article className="card">
          <h3>0G Storage</h3>
          <p>
            <strong>{storage.state}</strong>
          </p>
          <p className="muted">
            {storage.network} · {storage.mode} · signer{' '}
            {storage.signerConfigured ? 'configured' : 'unconfigured'}
          </p>
        </article>
        <article className="card">
          <h3>0G Chain</h3>
          <p>
            <strong>{chain.state}</strong>
          </p>
          <p className="muted">
            {chainConfig.network} · chain {chainConfig.chainId} · registry{' '}
            {chain.registryConfigured ? 'configured' : 'unconfigured'}
          </p>
        </article>
      </div>
      <article className="card">
        <h2>Production mode</h2>
        <p>
          <strong>
            {runtimeConfig.liveWritesEnabled ? 'Controlled live testnet' : 'Safe public'}
          </strong>
        </p>
        <p className="muted">
          Test adapters are prohibited in Production. Secret values, private keys, and balances are
          never shown here.
        </p>
      </article>
    </main>
  );
}
