import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { createOptimization } from './actions';
import { readNousConfig, readOGComputeConfig } from '@optimiera/config';
import { NousPromptIntelligenceProvider, OGComputeRouterProvider } from '@optimiera/og-compute';
import { readUsagePaymentConfig } from '@optimiera/payment';
import { PaidOptimizationSubmit } from '@/components/paid-optimization-submit';

const modes = ['BALANCED', 'ACCURACY', 'CONCISE', 'STRUCTURED', 'AGENT', 'CREATIVE', 'SAFETY'];
const outputTypes = [
  'PLAIN_TEXT',
  'MARKDOWN',
  'JSON',
  'JSON_SCHEMA',
  'TABLE',
  'LIST',
  'CODE',
  'EMAIL',
  'REPORT',
  'SOCIAL_POST',
  'AGENT_INSTRUCTION',
  'CUSTOM',
];

export default async function Optimize() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') redirect('/sign-in');
    throw error;
  }
  const memberships = await db.member.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          projects: {
            where: { archivedAt: null },
            include: { prompts: { where: { archivedAt: null }, orderBy: { createdAt: 'desc' } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  const writable = memberships.filter((member) =>
    ['owner', 'admin', 'editor'].includes(member.role.toLowerCase()),
  );
  const firstWorkspace = writable[0]?.organization;
  const firstProject = firstWorkspace?.projects[0];
  const ogHealth = await new OGComputeRouterProvider(readOGComputeConfig()).healthCheck();
  const nousHealth = await new NousPromptIntelligenceProvider(readNousConfig()).healthCheck();
  const paymentConfig = readUsagePaymentConfig();

  return (
    <main className="appmain wide">
      <div className="eyebrow">OptimIEra Studio</div>
      <h1>Optimize a prompt</h1>
      <p className="lede">
        Provider: OptimIEra Rules Engine by default. Choose local deterministic optimization, 0G
        Compute, or Nous Hermes prompt intelligence.
      </p>
      <section className="card">
        <h3>Provider status</h3>
        <p>OptimIEra Rules Engine — Local deterministic</p>
        <p>
          0G Compute — {ogHealth.state} · network: {ogHealth.network} · model:{' '}
          {ogHealth.model ?? 'not selected'}
        </p>
        <p>
          Nous Hermes — {nousHealth.state} · model: {nousHealth.model ?? 'not selected'}
        </p>
      </section>
      {!writable.length || !firstProject ? (
        <div className="card">
          <h3>Workspace setup required</h3>
          <p className="muted">
            Create a workspace project or ask an owner/admin for editor access before running an
            optimization.
          </p>
        </div>
      ) : (
        <form className="stack" action={createOptimization}>
          <input type="hidden" name="idempotencyKey" value={randomUUID()} />
          <input type="hidden" name="paymentTxHash" value="" />
          <section className="card form-grid">
            <h3>Input</h3>
            <label>
              Provider
              <select name="providerType" defaultValue="RULES_ENGINE">
                <option value="RULES_ENGINE">OptimIEra Rules Engine — Local deterministic</option>
                <option value="OG_COMPUTE" disabled={ogHealth.state !== 'AVAILABLE'}>
                  {ogHealth.state === 'AVAILABLE'
                    ? '0G Compute — Live'
                    : `0G Compute — ${ogHealth.state === 'UNCONFIGURED' ? 'Unconfigured' : 'Unavailable'}`}
                </option>
                <option value="NOUS_AI" disabled={nousHealth.state !== 'AVAILABLE'}>
                  {nousHealth.state === 'AVAILABLE'
                    ? 'Nous Hermes 4 — Enhanced prompt intelligence'
                    : `Nous Hermes — ${nousHealth.state === 'UNCONFIGURED' ? 'Unconfigured' : 'Unavailable'}`}
                </option>
              </select>
            </label>
            <label>
              Workspace
              <select name="workspaceId" defaultValue={firstWorkspace.id}>
                {writable.map((member) => (
                  <option key={member.organizationId} value={member.organizationId}>
                    {member.organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Project
              <select name="projectId" defaultValue={firstProject.id}>
                {writable.flatMap((member) =>
                  member.organization.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {member.organization.name} / {project.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label>
              Existing prompt or create new
              <select name="promptId" defaultValue="__new__">
                <option value="__new__">Create new prompt</option>
                {writable.flatMap((member) =>
                  member.organization.projects.flatMap((project) =>
                    project.prompts.map((prompt) => (
                      <option key={prompt.id} value={prompt.id}>
                        {project.name} / {prompt.title}
                      </option>
                    )),
                  ),
                )}
              </select>
            </label>
            <label>
              New prompt title
              <input name="newPromptTitle" defaultValue="Optimized prompt" />
            </label>
            <label className="span-2">
              Raw prompt
              <textarea name="rawPrompt" required rows={8} />
            </label>
            <label>
              Intended task
              <input name="intendedTask" required />
            </label>
            <label>
              Target audience
              <input name="targetAudience" required />
            </label>
            <label>
              Desired output type
              <select name="desiredOutputType" defaultValue="MARKDOWN">
                {outputTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Tone
              <input name="desiredTone" required defaultValue="Clear, professional, and precise" />
            </label>
            <label>
              Optimization mode
              <select name="optimizationMode" defaultValue="BALANCED">
                {modes.map((mode) => (
                  <option key={mode}>{mode}</option>
                ))}
              </select>
            </label>
            <label>
              Expected length
              <input name="expectedLength" defaultValue="As concise as possible while complete" />
            </label>
            <label>
              Output language
              <input name="outputLanguage" defaultValue="English" />
            </label>
            <label>
              Privacy level
              <select name="privacyLevel" defaultValue="PRIVATE">
                <option>PRIVATE</option>
                <option>WORKSPACE</option>
                <option>PUBLIC</option>
              </select>
            </label>
            <label className="span-2">
              Additional context
              <textarea name="additionalContext" rows={3} />
            </label>
            <label>
              Constraints
              <textarea name="constraints" rows={5} placeholder="One per line" />
            </label>
            <label>
              Required elements
              <textarea name="requiredElements" rows={5} placeholder="One per line" />
            </label>
            <label>
              Forbidden elements
              <textarea name="forbiddenElements" rows={5} placeholder="One per line" />
            </label>
            <label>
              Examples
              <textarea name="examples" rows={5} placeholder="One per line" />
            </label>
            <label className="span-2">
              Structured output schema
              <textarea name="structuredOutputSchema" rows={4} placeholder='{"type":"object"}' />
            </label>
            <PaidOptimizationSubmit
              enabled={paymentConfig.enabled}
              recipient={paymentConfig.recipient}
              amountWei={paymentConfig.amountWei.toString()}
              chainId={paymentConfig.chainId}
            />
          </section>
        </form>
      )}
    </main>
  );
}
