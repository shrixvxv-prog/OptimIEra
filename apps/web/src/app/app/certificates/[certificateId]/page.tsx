import { getAuthenticatedCertificate, verifyOptimizationCertificate } from '@/lib/certificate';
import { revokeCertificate } from '../actions';

export default async function Certificate({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const id = (await params).certificateId;
  const certificate = await getAuthenticatedCertificate(id);
  const verification = await verifyOptimizationCertificate(certificate.certificateId);
  return (
    <main className="appmain">
      <div className="eyebrow">Certificate</div>
      <h1>{certificate.publicSlug}</h1>
      <p className="lede">
        <strong>{verification.verificationLevel}</strong> ·{' '}
        {verification.overall ? 'Verified' : 'Verification failed'}
      </p>
      <p>Aggregate score: {certificate.aggregateScore}</p>
      <p>Confidence: {certificate.confidence}</p>
      <p>
        Public URL:{' '}
        <a href={`/verify/${certificate.publicSlug}`}>/verify/{certificate.publicSlug}</a>
      </p>
      <p>Issued: {certificate.issuedAt.toISOString()}</p>
      <ul>
        {verification.checks.map((check) => (
          <li key={check.name}>
            {check.name}: {check.status}
          </li>
        ))}
      </ul>
      {certificate.status !== 'REVOKED' && (
        <form action={revokeCertificate} className="mini-form">
          <input type="hidden" name="certificateId" value={certificate.id} />
          <label>
            Reason
            <input
              name="reason"
              defaultValue="Certificate revoked by authorized administrator"
              required
            />
          </label>
          <button className="button" type="submit">
            Revoke certificate
          </button>
        </form>
      )}
    </main>
  );
}
