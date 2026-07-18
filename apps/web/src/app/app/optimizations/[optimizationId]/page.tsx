import { loadOptimizationResult, serializeCandidateForApi } from '@/lib/optimization';
import { saveCandidate, createEvidence, createProof, revokeProof } from './actions';
import { getEvidenceForOptimization } from '@/lib/evidence';
import { readOGStorageConfig } from '@optimiera/config';
import { OGStorageAdapter } from '@optimiera/og-storage';
import { getProofForOptimization, getChainHealth } from '@/lib/chain-proof';
import { db } from '@optimiera/database';
import { issueCertificate } from '../../certificates/actions';
import { RedirectingActionForm } from '@/components/redirecting-action-form';

export default async function OptimizationDetail({
  params,
}: {
  params: Promise<{ optimizationId: string }>;
}) {
  const { optimizationId } = await params;
  const result = await loadOptimizationResult(optimizationId);
  const analysis = result.analysis as {
    detectedIntent?: string;
    detectedTaskCategory?: string;
    overallScore?: number;
    confidence?: number;
    strengths?: string[];
    weaknesses?: string[];
    missingInformation?: string[];
    recommendations?: string[];
    dimensionScores?: Record<string, { score: number; explanation: string }>;
  } | null;
  const candidates = result.candidates.map(serializeCandidateForApi);
  const recommended = candidates.find((candidate) => candidate.recommended) ?? candidates[0];
  const evidence = await getEvidenceForOptimization(optimizationId);
  const storageHealth = await new OGStorageAdapter(readOGStorageConfig()).healthCheck();
  const chainHealth = await getChainHealth();
  const proof = await getProofForOptimization(optimizationId);
  const certificate = await db.certificate.findFirst({
    where: { optimizationJobId: optimizationId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="appmain wide">
      <div className="eyebrow">Optimization / {result.status}</div>
      <h1>Optimization result</h1>
      <p className="lede">
        Provider: {result.providerName}.{' '}
        {result.providerType === 'OG_COMPUTE' && result.status === 'SUCCEEDED'
          ? '0G Compute Router — Live verified'
          : 'Rules Engine — Local deterministic'}
      </p>
      {result.providerType !== 'OG_COMPUTE' && (
        <p className="muted">Mode: Deterministic local optimization</p>
      )}
      <section className="grid">
        <div className="card">
          <h3>Recommendation</h3>
          <p className="score">{result.recommendedScore ?? 'n/a'}</p>
          <p className="muted">
            Recommended candidate:{' '}
            {recommended?.candidateType ?? result.evaluation?.winnerLabel ?? 'Original'}
          </p>
          <p>{result.evaluation?.recommendationRationale}</p>
          {result.evaluation?.winnerLabel && (
            <p className="mono">{result.evaluation.winnerLabel}</p>
          )}
        </div>
        <div className="card">
          <h3>Analysis</h3>
          <p className="score">{analysis?.overallScore ?? result.originalScore ?? 'n/a'}</p>
          <p>{analysis?.detectedIntent}</p>
          <p className="muted">{analysis?.detectedTaskCategory}</p>
        </div>
      </section>
      <section className="card">
        <h3>Certificate</h3>
        {certificate ? (
          <>
            <p>
              Status: <strong>{certificate.verificationLevel}</strong>
            </p>
            <p>
              <a href={`/app/certificates/${certificate.id}`}>Open certificate</a>
            </p>
          </>
        ) : (
          <p className="muted">
            Save a candidate, create encrypted evidence, and create a proof commitment before
            issuing.
          </p>
        )}
        {!certificate && result.savedPromptVersionId && evidence && proof && (
          <form action={issueCertificate} className="mini-form">
            <input type="hidden" name="optimizationId" value={optimizationId} />
            <button className="button" type="submit">
              Issue certificate
            </button>
          </form>
        )}
      </section>
      <section className="card">
        <h3>0G Chain proof</h3>
        <p>
          Status: <strong>{proof?.status ?? 'NOT_CREATED'}</strong>
        </p>
        <p className="muted">
          {proof
            ? 'Local proof commitment · hash-only onchain design'
            : 'Create a local deterministic proof commitment from verified encrypted evidence.'}
        </p>
        {proof?.proofId && <p className="mono">Proof ID: {proof.proofId}</p>}
        {proof?.manifestHash && <p className="mono">Manifest hash: {proof.manifestHash}</p>}
        {proof?.aggregateScore != null && (
          <p className="mono">Aggregate score: {proof.aggregateScore}</p>
        )}
        {proof?.transactionHash && <p className="mono">Transaction: {proof.transactionHash}</p>}
        {proof?.blockNumber != null && <p className="mono">Block: {String(proof.blockNumber)}</p>}
        {proof?.contractAddress && <p className="mono">Contract: {proof.contractAddress}</p>}
        {proof?.registrarAddress && <p className="mono">Registrar: {proof.registrarAddress}</p>}
        {proof?.confirmationCount != null && (
          <p className="mono">Confirmations: {proof.confirmationCount}</p>
        )}
        {proof?.safeErrorMessage && <p className="error">{proof.safeErrorMessage}</p>}
        {!proof && (
          <RedirectingActionForm
            action={createProof}
            redirectTo={`/app/optimizations/${optimizationId}`}
            className="mini-form"
          >
            <input type="hidden" name="optimizationJobId" value={optimizationId} />
            <input type="hidden" name="action" value="local" />
            <button className="button" type="submit">
              Create proof commitment
            </button>
          </RedirectingActionForm>
        )}
        {proof && (
          <RedirectingActionForm
            action={createProof}
            redirectTo={`/app/optimizations/${optimizationId}`}
            className="mini-form"
          >
            <input type="hidden" name="optimizationJobId" value={optimizationId} />
            <input type="hidden" name="action" value="register" />
            <button
              className="button"
              type="submit"
              disabled={chainHealth.state === 'UNCONFIGURED' || proof.status === 'VERIFIED'}
            >
              Register on 0G Chain
            </button>
          </RedirectingActionForm>
        )}
        {proof?.status === 'VERIFIED' && (
          <RedirectingActionForm
            action={revokeProof}
            redirectTo={`/app/optimizations/${optimizationId}`}
            className="mini-form"
          >
            <input type="hidden" name="optimizationJobId" value={optimizationId} />
            <label>
              Revocation reason
              <input
                name="reason"
                required
                defaultValue="Proof revoked by authorized administrator"
              />
            </label>
            <button className="button" type="submit">
              Revoke proof
            </button>
          </RedirectingActionForm>
        )}
        <p className="muted">
          0G Chain —{' '}
          {proof?.status === 'VERIFIED' && proof.network === 'test-adapter'
            ? 'Test chain adapter — Verified'
            : proof?.status === 'VERIFIED'
              ? 'Live verified'
              : chainHealth.state === 'UNCONFIGURED'
                ? 'Unconfigured'
                : chainHealth.state === 'AVAILABLE'
                  ? 'Configured but awaiting verification'
                  : 'Configured but unavailable'}
        </p>
      </section>
      <section className="card">
        <h3>Evidence</h3>
        <p>
          Status: <strong>{evidence?.status ?? 'NOT_CREATED'}</strong>
        </p>
        <p className="muted">
          {evidence
            ? `${evidence.storageProvider ?? 'Local encrypted evidence'} · ${evidence.network ?? 'local'} · ${evidence.storageMode ?? 'AES-256-GCM'}`
            : 'Create an encrypted local evidence manifest before uploading to 0G Storage.'}
        </p>
        {evidence?.contentHash && <p className="mono">Content hash: {evidence.contentHash}</p>}
        {evidence?.byteSize != null && <p className="mono">Byte size: {evidence.byteSize}</p>}
        {evidence?.rootHash && <p className="mono">Root hash: {evidence.rootHash}</p>}
        {evidence?.transactionHash && (
          <p className="mono">Transaction: {evidence.transactionHash}</p>
        )}
        {evidence?.safeErrorMessage && <p className="error">{evidence.safeErrorMessage}</p>}
        {!evidence && (
          <RedirectingActionForm
            action={createEvidence}
            redirectTo={`/app/optimizations/${optimizationId}`}
            className="mini-form"
          >
            <input type="hidden" name="optimizationJobId" value={optimizationId} />
            <button className="button" type="submit">
              Create encrypted evidence
            </button>
          </RedirectingActionForm>
        )}
        <RedirectingActionForm
          action={createEvidence}
          redirectTo={`/app/optimizations/${optimizationId}`}
          className="mini-form"
        >
          <input type="hidden" name="optimizationJobId" value={optimizationId} />
          <button
            className="button"
            type="submit"
            disabled={!evidence || storageHealth.state === 'UNCONFIGURED'}
          >
            {evidence?.status === 'FAILED' ? 'Retry upload' : 'Upload to 0G Storage'}
          </button>
        </RedirectingActionForm>
        {evidence?.status !== 'FAILED' && (
          <p className="muted">Retry is available after a failed upload.</p>
        )}
        <p className="muted">0G Storage — {storageHealth.state}</p>
      </section>
      <section className="card">
        <h3>Dimension scores</h3>
        <div className="score-grid">
          {Object.entries(analysis?.dimensionScores ?? {}).map(([name, score]) => (
            <div key={name} className="score-cell">
              <span>{name}</span>
              <strong>{score.score}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="grid">
        <div className="card">
          <h3>Strengths</h3>
          <ul>
            {analysis?.strengths?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Weaknesses</h3>
          <ul>
            {analysis?.weaknesses?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Missing information</h3>
          <ul>
            {analysis?.missingInformation?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Recommendations</h3>
          <ul>
            {analysis?.recommendations?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="card">
        <h3>Candidates</h3>
        <div className="candidate-grid">
          <article className="candidate">
            <h4>Original</h4>
            <p className="score">{result.originalScore ?? 'n/a'}</p>
            <p className="muted">Source prompt remains immutable.</p>
          </article>
          {candidates.map((candidate) => (
            <article className="candidate" key={candidate.id}>
              <h4>
                {candidate.candidateType} {candidate.recommended ? '(recommended)' : ''}
              </h4>
              <p className="score">
                {(candidate.scoreData as { weightedTotal?: number } | null)?.weightedTotal ?? 'n/a'}
              </p>
              <p>{candidate.changeSummary}</p>
              <p className="muted">Token impact: {candidate.tokenEstimate}</p>
              <pre>{candidate.optimizedPrompt}</pre>
              <RedirectingActionForm action={saveCandidate} className="mini-form">
                <input type="hidden" name="optimizationJobId" value={result.id} />
                <input type="hidden" name="candidateId" value={candidate.id} />
                <label>
                  Version change summary
                  <input
                    name="changeSummary"
                    defaultValue={`Saved ${candidate.candidateType.toLowerCase()} optimization`}
                  />
                </label>
                <label className="inline">
                  <input type="checkbox" name="submitForReview" /> Submit for review
                </label>
                <button className="button" type="submit">
                  Save as new version
                </button>
              </RedirectingActionForm>
            </article>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>Prompt diff</h3>
        <p className="muted">{result.diff?.materialChangeSummary.join(' ')}</p>
        <div className="diff">
          {result.diff?.lineDiff.map((line, index) => (
            <code key={`${line.type}-${index}`} className={line.type}>
              {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
              {line.value}
            </code>
          ))}
        </div>
      </section>
    </main>
  );
}
