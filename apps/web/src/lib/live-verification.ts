import 'server-only';

import { readOGExecutionMode } from '@optimiera/config';
import { finalizeOptimizationEvidence } from './evidence';
import { registerOptimizationProof, getProofForOptimization } from './chain-proof';
import { issueOptimizationCertificate } from './certificate';
import { assertVerificationTransition } from './verification-service';

/**
 * Runs the production Galileo workflow using the existing evidence, chain,
 * and certificate implementations. It intentionally rejects local/test and
 * mainnet modes so they cannot be presented as Galileo evidence.
 */
export async function completeGalileoVerification(optimizationId: string) {
  if (readOGExecutionMode() !== 'GALILEO_LIVE') throw new Error('GALILEO_LIVE_REQUIRED');

  await finalizeOptimizationEvidence(optimizationId);
  assertVerificationTransition('EVIDENCE_CREATED', 'STORAGE_VERIFIED');
  const proof = await registerOptimizationProof(optimizationId);
  if (proof.status !== 'VERIFIED' || proof.network === 'test-adapter')
    throw new Error('CHAIN_VERIFICATION_REQUIRED');

  const certificateResult = await issueOptimizationCertificate(optimizationId);
  if (certificateResult.certificate.verificationLevel !== 'FULLY_VERIFIED')
    throw new Error('FULL_VERIFICATION_REQUIRED');
  return certificateResult;
}

export async function assertGalileoVerificationReady(optimizationId: string) {
  const proof = await getProofForOptimization(optimizationId);
  if (!proof || proof.status !== 'VERIFIED' || proof.network === 'test-adapter')
    throw new Error('CHAIN_VERIFICATION_REQUIRED');
  return proof;
}
