import { getChainHealth } from '@/lib/chain-proof';
import { readOGStorageConfig } from '@optimiera/config';
import { OGStorageAdapter } from '@optimiera/og-storage';
import { ProofLookup } from '@/components/proof-lookup';
import {
  OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT,
  readMainnetRegistryEvidence,
  readMainnetSourceVerification,
} from '@optimiera/og-chain';

export const dynamic = 'force-dynamic';

export default async function Proofs() {
  const [chain, storage, mainnet, mainnetSource] = await Promise.all([
    getChainHealth(),
    new OGStorageAdapter(readOGStorageConfig()).healthCheck(),
    readMainnetRegistryEvidence().catch(() => null),
    readMainnetSourceVerification(),
  ]);
  const mainnetReadback = Boolean(
    mainnet?.chainId === OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.chainId &&
      mainnet.transactionFound &&
      mainnet.receiptStatus === 'success' &&
      mainnet.deployedBytecode &&
      mainnet.adminRoleVerified &&
      mainnet.registrarRoleVerified &&
      !mainnet.paused,
  );
  return (
    <main className="site">
      <section className="section">
        <div className="eyebrow">OptimIEra Proof Center</div>
        <h1>Verified OptimIEra Assets.</h1>
        <div className="card">
          <h3>Certificate lookup</h3>
          <p className="muted">
            Open an exact public certificate URL to verify a certificate. Private certificates are
            not listed automatically.
          </p>
          <ProofLookup />
          <p>
            <a href="https://docs.optimiera.dev/guides/verify-certificate">Verification guide</a>
          </p>
        </div>
        <div className="grid">
          <article className="card">
            <div className="eyebrow">GALILEO · chain 16602</div>
            <h2>Verified Prompt Asset evidence</h2>
            <p>
              <strong>FULLY_VERIFIED</strong> · qwen2.5-omni
            </p>
            <p className="mono">Registry: 0xda91a3929107c74f27e2d3288d046e4a37f9b422</p>
            <a className="button primary" href="/verify/cert_1343d8825f8905d881361fa39d7e2a1e">
              Open Galileo certificate
            </a>
          </article>
          <article className="card">
            <div className="eyebrow">MAINNET · chain 16661</div>
            <h2>Registry deployment</h2>
            <p>
              Readback: <strong>{mainnetReadback ? 'VERIFIED' : 'UNAVAILABLE'}</strong>
            </p>
            <p>Source: {mainnetSource.status}</p>
            <p className="mono">
              Registry: {OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.address}
            </p>
            <p className="muted">
              This proves the registry deployment only. No mainnet Prompt Asset commitment, Storage
              upload, or Compute inference is claimed here.
            </p>
            <a
              className="button"
              href={`${OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.explorerUrl}/tx/${OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.transactionHash}`}
              target="_blank"
              rel="noreferrer"
            >
              Open mainnet deployment
            </a>
          </article>
        </div>
        <div className="grid">
          <div className="card">
            <h3>0G Compute</h3>
            <p>
              0G is required for a Verified OptimIEra Asset; Local Optimization remains available
              without it.
            </p>
          </div>
          <div className="card">
            <h3>0G Storage</h3>
            <p>{storage.state} — real roots appear only after verified upload/download.</p>
          </div>
          <div className="card">
            <h3>0G Chain</h3>
            <p>{chain.state} — test infrastructure is never a live badge.</p>
          </div>
          <div className="card">
            <h3>Trust levels</h3>
            <p>
              Local Optimization is distinct from Storage-verified, Chain-confirmed, Fully verified,
              Revoked, and Failed asset states.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
