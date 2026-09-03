'use server';

import { redirect } from 'next/navigation';
import {
  attachRegressionSuite,
  regressionProviders,
  runRegressionForPrompt,
} from '@/lib/regression-service';

export async function attachRegressionAction(formData: FormData) {
  const promptId = String(formData.get('promptId') ?? '');
  await attachRegressionSuite({
    promptId,
    suiteId: String(formData.get('suiteId') ?? ''),
    policy: String(formData.get('policy') ?? ''),
  });
  redirect(`/app/prompts/${promptId}#regression`);
}

export async function runRegressionAction(formData: FormData) {
  const providerKey =
    String(formData.get('provider') ?? 'local') === 'og-compute' ? 'og-compute' : 'local';
  await runRegressionForPrompt({
    promptId: String(formData.get('promptId') ?? ''),
    baselineVersionId: String(formData.get('baselineVersionId') ?? ''),
    candidateVersionId: String(formData.get('candidateVersionId') ?? ''),
    provider: regressionProviders[providerKey](),
  });
  redirect(`/app/prompts/${String(formData.get('promptId') ?? '')}#regression`);
}
