'use server';

import { redirect } from 'next/navigation';
import { saveOptimizationCandidate } from '@/lib/optimization';
import { finalizeOptimizationEvidence } from '@/lib/evidence';
import {
  createLocalProofCommitment,
  registerOptimizationProof,
  revokeOptimizationProof,
} from '@/lib/chain-proof';

export async function saveCandidate(formData: FormData) {
  const optimizationJobId = String(formData.get('optimizationJobId') ?? '');
  const candidateId = String(formData.get('candidateId') ?? '');
  const version = await saveOptimizationCandidate({
    optimizationJobId,
    candidateId,
    changeSummary: String(formData.get('changeSummary') ?? '') || undefined,
    submitForReview: formData.get('submitForReview') === 'on',
  });
  redirect(`/app/prompts/${version.promptId}/versions/${version.id}`);
}

export async function createEvidence(formData: FormData) {
  const optimizationJobId = String(formData.get('optimizationJobId') ?? '');
  await finalizeOptimizationEvidence(optimizationJobId);
  redirect(`/app/optimizations/${optimizationJobId}`);
}

export async function createProof(formData: FormData) {
  const optimizationJobId = String(formData.get('optimizationJobId') ?? '');
  const action = String(formData.get('action') ?? 'local');
  if (action === 'register') await registerOptimizationProof(optimizationJobId);
  else await createLocalProofCommitment(optimizationJobId);
  redirect(`/app/optimizations/${optimizationJobId}`);
}

export async function revokeProof(formData: FormData) {
  const optimizationJobId = String(formData.get('optimizationJobId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) throw new Error('VALIDATION_ERROR');
  await revokeOptimizationProof(optimizationJobId, reason);
  redirect(`/app/optimizations/${optimizationJobId}`);
}
