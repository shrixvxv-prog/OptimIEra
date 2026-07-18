import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { issueCertificate } from './actions';

export default async function Certificates() {
  const session = await requireSession();
  const memberships = await db.member.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const certificates = await db.certificate.findMany({
    where: { workspaceId: { in: memberships.map((item) => item.organizationId) } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return (
    <main className="appmain">
      <div className="eyebrow">Optimization Certificates</div>
      <h1>Certificates</h1>
      <div className="card">
        <h3>Proof Center</h3>
        <p className="muted">
          Immutable certificates backed by local evidence and available proof records.
        </p>
        {certificates.length === 0 ? (
          <p className="muted">No certificates issued yet.</p>
        ) : (
          certificates.map((certificate) => (
            <p key={certificate.id}>
              <a href={`/app/certificates/${certificate.id}`}>{certificate.publicSlug}</a> —{' '}
              {certificate.verificationLevel}
            </p>
          ))
        )}
        <form action={issueCertificate} className="mini-form">
          <label>
            Optimization ID
            <input name="optimizationId" required />
          </label>
          <button className="button" type="submit">
            Issue certificate
          </button>
        </form>
      </div>
    </main>
  );
}
