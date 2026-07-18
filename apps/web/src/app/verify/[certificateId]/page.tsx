import { verifyOptimizationCertificate } from '@/lib/certificate';

export default async function Verify({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  const result = await verifyOptimizationCertificate(certificateId).catch(() => null);
  if (!result)
    return (
      <main className="site">
        <section className="section">
          <h1>Certificate not found.</h1>
        </section>
      </main>
    );
  return (
    <main className="site">
      <section className="section">
        <div className="eyebrow">OptimIEra Certificate</div>
        <h1>{result.verificationLevel}</h1>
        <p className="lede">
          {result.overall
            ? 'Public evidence verified.'
            : 'Verification failed or the certificate is revoked.'}
        </p>
        <div className="grid">
          <article className="card">
            <h2>Compute</h2>
            <p>Provider: {result.certificate.providerName}</p>
            <p>Model: {result.certificate.model ?? 'Not recorded'}</p>
            <p className="mono">Request: {result.providerRequestId ?? 'Not recorded'}</p>
            {result.providerResponseId && (
              <p className="mono">Response: {result.providerResponseId}</p>
            )}
          </article>
          <article className="card">
            <h2>Storage</h2>
            <p>Status: {result.storageStatus}</p>
            <p className="mono">Root: {result.certificate.storageRoot ?? 'Local evidence'}</p>
            {result.certificate.storageTransactionHash && (
              <a
                href={`https://storagescan-galileo.0g.ai/transaction/${result.certificate.storageTransactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Storage transaction
              </a>
            )}
          </article>
          <article className="card">
            <h2>0G Chain</h2>
            <p>Status: {result.chainStatus}</p>
            <p>Readback: {result.contractReadbackStatus}</p>
            <p>Chain ID: {result.certificate.chainId ?? 'Local'}</p>
            <p className="mono">Registry: {result.certificate.contractAddress ?? 'Local proof'}</p>
            <p className="mono">Proof ID: {result.certificate.chainProofId ?? 'Local proof'}</p>
            <p>Block: {result.proofBlock ?? 'Not submitted'}</p>
            {result.certificate.chainTransactionHash && (
              <a
                href={`https://chainscan-galileo.0g.ai/tx/${result.certificate.chainTransactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Proof transaction
              </a>
            )}
          </article>
        </div>
        <article className="card">
          <h2>Certificate integrity</h2>
          <p>Aggregate score: {result.certificate.aggregateScore}</p>
          <p>Confidence: {result.certificate.confidence}</p>
          <p className="mono">Manifest hash: {result.certificate.manifestHash}</p>
          <p>Issued: {result.certificate.issuedAt}</p>
          <p>Last verified: {result.verifiedAt}</p>
          <p className="muted">
            FULLY_VERIFIED means the encrypted manifest, immutable prompt-version hashes, Storage
            evidence, and chain commitment agree. It does not reveal the prompt plaintext.
          </p>
          <ul>
            {result.checks.map((check) => (
              <li key={check.name}>
                {check.name}: <strong>{check.status}</strong>
              </li>
            ))}
          </ul>
          <a href={`/api/v1/public/certificates/${result.certificate.publicSlug}/download`}>
            Download certificate JSON
          </a>
        </article>
      </section>
    </main>
  );
}
