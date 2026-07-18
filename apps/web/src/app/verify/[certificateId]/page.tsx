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
        <p>Aggregate score: {result.certificate.aggregateScore}</p>
        <p>Confidence: {result.certificate.confidence}</p>
        <p>Provider: {result.certificate.providerName}</p>
        <p>Original prompt hash: {result.certificate.originalPromptHash}</p>
        <p>Optimized prompt hash: {result.certificate.optimizedPromptHash}</p>
        <p>Evaluation hash: {result.certificate.evaluationHash}</p>
        <p>Manifest hash: {result.certificate.manifestHash}</p>
        <p>Issued: {result.certificate.issuedAt}</p>
        <ul>
          {result.checks.map((check) => (
            <li key={check.name}>
              {check.name}: {check.status}
            </li>
          ))}
        </ul>
        <a href={`/api/v1/public/certificates/${result.certificate.publicSlug}/download`}>
          Download certificate JSON
        </a>
      </section>
    </main>
  );
}
