import { requireSession } from '@/lib/authorization';
import { getLiveOperationQuotaSnapshot } from '@/lib/live-operation-quota';

export default async function Usage() {
  const session = await requireSession();
  const quota = await getLiveOperationQuotaSnapshot(session.user.id);
  return (
    <main className="appmain">
      <div className="eyebrow">Public live-operation safety</div>
      <h1>Daily 0G quotas</h1>
      <p className="lede">
        {quota.enabled
          ? 'Controlled live testnet mode is enabled.'
          : 'Safe public mode is active. Server-funded live writes are disabled.'}
      </p>
      <div className="grid">
        {Object.entries(quota.operations).map(([operation, value]) => (
          <article className="card" key={operation}>
            <h2>{operation}</h2>
            <p>
              Your usage: {value.userUsed} / {value.userLimit}
            </p>
            <p className="muted">
              Global usage: {value.globalUsed} / {value.globalLimit}
            </p>
          </article>
        ))}
      </div>
      <p className="muted">Quotas reset at {quota.resetsAt.toISOString()}.</p>
    </main>
  );
}
