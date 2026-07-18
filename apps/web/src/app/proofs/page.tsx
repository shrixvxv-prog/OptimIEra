import { getChainHealth } from '@/lib/chain-proof';
import { readOGStorageConfig } from '@optimiera/config';
import { OGStorageAdapter } from '@optimiera/og-storage';

export default async function Proofs() {
  const [chain, storage] = await Promise.all([
    getChainHealth(),
    new OGStorageAdapter(readOGStorageConfig()).healthCheck(),
  ]);
  return (
    <main className="site">
      <section className="section">
        <div className="eyebrow">OptimIEra Proof Center</div>
        <h1>Public verification status.</h1>
        <div className="card">
          <h3>Certificate lookup</h3>
          <p className="muted">
            Open an exact public certificate URL to verify a certificate. Private certificates are
            not listed automatically.
          </p>
          <p>
            <a href="/docs/guides/verify-certificate">Verification guide</a>
          </p>
        </div>
        <div className="grid">
          <div className="card">
            <h3>0G Compute</h3>
            <p>Configured status is reported separately from certificate trust.</p>
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
            <p>Local, Storage, Chain, Fully verified, Test verified, Revoked, and Failed.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
