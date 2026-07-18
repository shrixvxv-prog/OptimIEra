export const certificateLevels = [
  'LOCAL_VERIFIED',
  'STORAGE_VERIFIED',
  'CHAIN_VERIFIED',
  'FULLY_VERIFIED',
  'TEST_VERIFIED',
  'REVOKED',
  'FAILED',
] as const;

export type CertificateVerificationLevel = (typeof certificateLevels)[number];

export type OptimizationCertificateV1 = {
  schemaVersion: 'OptimizationCertificateV1';
  certificateId: string;
  publicSlug: string;
  optimizationId: string;
  issuerRefHash: string;
  sourcePromptVersionId: string;
  selectedPromptVersionId: string;
  selectedCandidateId: string;
  analyzerVersion: string | null;
  scoringVersion: string | null;
  providerType: string;
  providerName: string;
  model: string | null;
  originalPromptHash: string;
  optimizedPromptHash: string;
  evaluationHash: string;
  manifestHash: string;
  storageRoot: string | null;
  storageTransactionHash: string | null;
  chainProofId: string | null;
  chainTransactionHash: string | null;
  contractAddress: string | null;
  chainId: number | null;
  network: string | null;
  aggregateScore: number;
  confidence: number;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  verificationLevel: CertificateVerificationLevel;
  certificateContentHash: string;
};

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  }
  return value;
}

export function canonicalCertificate(
  value: Omit<OptimizationCertificateV1, 'certificateContentHash'>,
) {
  return JSON.stringify(sortValue(value));
}
