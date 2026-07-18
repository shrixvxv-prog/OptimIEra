'use server';

import { redirect } from 'next/navigation';
import { runOptimization } from '@/lib/optimization';
import type { DesiredOutputType, OptimizationMode, PrivacyLevel } from '@optimiera/schemas';

function lines(formData: FormData, name: string) {
  return String(formData.get(name) ?? '')
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function createOptimization(formData: FormData) {
  const promptId = String(formData.get('promptId') ?? '');
  const createNew = promptId === '__new__';
  const result = await runOptimization({
    providerType: String(formData.get('providerType') ?? 'RULES_ENGINE') as
      'RULES_ENGINE' | 'OG_COMPUTE',
    idempotencyKey: String(formData.get('idempotencyKey') ?? ''),
    request: {
      promptId: createNew ? undefined : promptId,
      newPrompt: createNew
        ? {
            workspaceId: String(formData.get('workspaceId') ?? ''),
            projectId: String(formData.get('projectId') ?? ''),
            title: String(formData.get('newPromptTitle') ?? ''),
          }
        : undefined,
      rawPrompt: String(formData.get('rawPrompt') ?? ''),
      intendedTask: String(formData.get('intendedTask') ?? ''),
      targetAudience: String(formData.get('targetAudience') ?? ''),
      desiredOutputType: String(
        formData.get('desiredOutputType') ?? 'MARKDOWN',
      ) as DesiredOutputType,
      desiredTone: String(formData.get('desiredTone') ?? ''),
      optimizationMode: String(formData.get('optimizationMode') ?? 'BALANCED') as OptimizationMode,
      constraints: lines(formData, 'constraints'),
      requiredElements: lines(formData, 'requiredElements'),
      forbiddenElements: lines(formData, 'forbiddenElements'),
      examples: lines(formData, 'examples'),
      expectedLength: {
        label: String(formData.get('expectedLength') ?? ''),
      },
      outputLanguage: String(formData.get('outputLanguage') ?? 'English'),
      structuredOutputSchema: String(formData.get('structuredOutputSchema') ?? '') || undefined,
      privacyLevel: String(formData.get('privacyLevel') ?? 'PRIVATE') as PrivacyLevel,
      additionalContext: String(formData.get('additionalContext') ?? '') || undefined,
    },
  });
  redirect(`/app/optimizations/${result.job.id}`);
}
