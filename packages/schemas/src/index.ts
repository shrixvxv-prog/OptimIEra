import { z } from 'zod';

export const capabilityStatus = z.enum([
  'COMPLETE',
  'IN PROGRESS',
  'PLANNED',
  'BLOCKED',
  'DEPRECATED',
]);
export type CapabilityStatus = z.infer<typeof capabilityStatus>;
export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});
export type Environment = z.infer<typeof environmentSchema>;

export const optimizationModeSchema = z.enum([
  'BALANCED',
  'ACCURACY',
  'CONCISE',
  'STRUCTURED',
  'AGENT',
  'CREATIVE',
  'SAFETY',
]);
export type OptimizationMode = z.infer<typeof optimizationModeSchema>;

export const privacyLevelSchema = z.enum(['PRIVATE', 'WORKSPACE', 'PUBLIC']);
export type PrivacyLevel = z.infer<typeof privacyLevelSchema>;

export const desiredOutputTypeSchema = z.enum([
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
]);
export type DesiredOutputType = z.infer<typeof desiredOutputTypeSchema>;

const boundedText = (max: number) => z.string().trim().max(max);
const listText = z.array(z.string().trim().min(1).max(500)).max(20).default([]);

export const expectedLengthSchema = z
  .object({
    min: z.number().int().positive().max(20000).optional(),
    max: z.number().int().positive().max(20000).optional(),
    label: boundedText(120).optional(),
  })
  .refine((value) => !value.min || !value.max || value.min <= value.max, {
    message: 'Expected length minimum must be less than or equal to maximum.',
  });
export type ExpectedLength = z.infer<typeof expectedLengthSchema>;

export const optimizationRequestSchema = z
  .object({
    promptId: z.string().trim().min(1).optional(),
    sourcePromptVersionId: z.string().trim().min(1).optional(),
    newPrompt: z
      .object({
        workspaceId: z.string().trim().min(1),
        projectId: z.string().trim().min(1),
        title: boundedText(160).min(1),
      })
      .optional(),
    rawPrompt: boundedText(20000).min(1, 'Prompt cannot be empty.'),
    intendedTask: boundedText(2000).min(1),
    targetAudience: boundedText(1000).min(1),
    desiredOutputType: desiredOutputTypeSchema,
    desiredTone: boundedText(500).min(1),
    optimizationMode: optimizationModeSchema,
    constraints: listText,
    requiredElements: listText,
    forbiddenElements: listText,
    examples: listText,
    expectedLength: expectedLengthSchema,
    outputLanguage: boundedText(80).min(1),
    structuredOutputSchema: boundedText(6000).optional(),
    privacyLevel: privacyLevelSchema,
    additionalContext: boundedText(4000).optional(),
  })
  .refine((value) => Boolean(value.promptId) || Boolean(value.newPrompt), {
    message: 'Provide an existing promptId or new prompt metadata.',
  })
  .refine(
    (value) =>
      !value.structuredOutputSchema ||
      ['JSON', 'JSON_SCHEMA'].includes(value.desiredOutputType) ||
      value.structuredOutputSchema.trim().length === 0,
    { message: 'Structured output schema requires JSON or JSON_SCHEMA output.' },
  )
  .superRefine((value, context) => {
    if (value.structuredOutputSchema) {
      try {
        JSON.parse(value.structuredOutputSchema);
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['structuredOutputSchema'],
          message: 'Structured output schema must be valid JSON.',
        });
      }
    }
  });
export type OptimizationRequest = z.infer<typeof optimizationRequestSchema>;

export const verifiedPromptAssetStates = [
  'DRAFT',
  'ANALYZED',
  'OPTIMIZED',
  'VERSIONED',
  'EVIDENCE_CREATED',
  'STORAGE_PENDING',
  'STORAGE_VERIFIED',
  'CHAIN_PENDING',
  'CHAIN_CONFIRMED',
  'VERIFIED',
  'REVOKED',
  'FAILED',
] as const;
export const verifiedPromptAssetStateSchema = z.enum(verifiedPromptAssetStates);
export type VerifiedPromptAssetState = z.infer<typeof verifiedPromptAssetStateSchema>;

export type VerifiedPromptAsset = {
  assetId: string;
  owner: { userId: string; ownerReferenceHash: string };
  workspace: { workspaceId: string; workspaceReference: string };
  promptVersion: { id: string; versionId: string; hash: string };
  promptHash: string;
  manifestHash: string;
  evidenceRoot: string | null;
  storageReference: { provider: string; network: string | null; root: string | null };
  chainCommitment: {
    proofId: string | null;
    transactionHash: string | null;
    contractAddress: string | null;
    chainId: number | null;
  };
  registryTransaction: string | null;
  evaluationVersion: string | null;
  createdAt: string;
  verificationState: VerifiedPromptAssetState;
};

const legalVerificationTransitions: Record<
  VerifiedPromptAssetState,
  readonly VerifiedPromptAssetState[]
> = {
  DRAFT: ['ANALYZED', 'FAILED'],
  ANALYZED: ['OPTIMIZED', 'FAILED'],
  OPTIMIZED: ['VERSIONED', 'FAILED'],
  VERSIONED: ['EVIDENCE_CREATED', 'FAILED'],
  EVIDENCE_CREATED: ['STORAGE_PENDING', 'STORAGE_VERIFIED', 'FAILED'],
  STORAGE_PENDING: ['STORAGE_VERIFIED', 'FAILED'],
  STORAGE_VERIFIED: ['CHAIN_PENDING', 'FAILED'],
  CHAIN_PENDING: ['CHAIN_CONFIRMED', 'FAILED'],
  CHAIN_CONFIRMED: ['VERIFIED', 'FAILED'],
  VERIFIED: ['REVOKED'],
  REVOKED: [],
  FAILED: ['EVIDENCE_CREATED', 'STORAGE_PENDING', 'CHAIN_PENDING'],
};

export function canTransitionVerificationState(
  from: VerifiedPromptAssetState,
  to: VerifiedPromptAssetState,
) {
  return from === to || legalVerificationTransitions[from].includes(to);
}

export function transitionVerificationState(
  from: VerifiedPromptAssetState,
  to: VerifiedPromptAssetState,
) {
  if (!canTransitionVerificationState(from, to))
    throw new Error(`ILLEGAL_VERIFICATION_TRANSITION:${from}:${to}`);
  return to;
}

export function isVerifiedPromptAssetState(state: VerifiedPromptAssetState) {
  return state === 'VERIFIED';
}
