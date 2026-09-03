import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export default async function PromptVersion({
  params,
}: {
  params: Promise<{ promptId: string; versionId: string }>;
}) {
  const session = await requireSession();
  const { promptId, versionId } = await params;
  const version = await db.promptVersion.findFirst({
    where: {
      id: versionId,
      promptId,
      prompt: { workspace: { members: { some: { userId: session.user.id } } } },
    },
    include: {
      prompt: true,
      parentVersion: { select: { versionNumber: true } },
      baselineRegressionReports: true,
      candidateRegressionReports: true,
    },
  });
  if (!version)
    return (
      <main className="appmain">
        <h1>Version not found</h1>
      </main>
    );
  return (
    <main className="appmain">
      <div className="eyebrow">Prompt / Version {version.versionNumber}</div>
      <h1>{version.prompt.title}</h1>
      <div className="card">
        <p>
          State: <span className="status-pill">{version.lifecycleStatus}</span>
        </p>
        <p>Parent version: {version.parentVersion?.versionNumber ?? 'none'}</p>
        <p>Change summary: {version.changeSummary ?? 'None'}</p>
        <p className="muted">
          Content is encrypted at rest and is not rendered in this metadata view.
        </p>
      </div>
      <div className="card" id="regression">
        <h3>Regression reports</h3>
        {[...version.baselineRegressionReports, ...version.candidateRegressionReports].length ===
        0 ? (
          <p className="muted">No regression reports for this version.</p>
        ) : (
          [...version.baselineRegressionReports, ...version.candidateRegressionReports].map(
            (report) => (
              <p key={report.id}>
                <span className="status-pill">{report.status}</span> · {report.contentHash}
              </p>
            ),
          )
        )}
        <a className="button" href={`/app/prompts/${promptId}#regression`}>
          Open regression controls
        </a>
      </div>
    </main>
  );
}
