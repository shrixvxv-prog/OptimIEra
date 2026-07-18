import { getChainHealth } from '@/lib/chain-proof';
import { readOGStorageConfig } from '@optimiera/config';
import { OGStorageAdapter } from '@optimiera/og-storage';
import { ProofLookup } from '@/components/proof-lookup';

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
          <ProofLookup />
          <p>
            <a href="https://docs.optimiera.dev/guides/verify-certificate">Verification guide</a>
          </p>
        </div>
        <div className="card">
          <h2>Live verified Galileo evidence</h2>
          <p>
            <strong>FULLY_VERIFIED</strong> · qwen2.5-omni · chain 16602
          </p>
          <p className="mono">Registry: 0xda91a3929107c74f27e2d3288d046e4a37f9b422</p>
          <a className="button primary" href="/verify/cert_1343d8825f8905d881361fa39d7e2a1e">
            Open live certificate
          </a>
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
