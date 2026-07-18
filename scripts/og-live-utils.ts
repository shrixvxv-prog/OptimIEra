export type LiveStatus = 'READY' | 'UNCONFIGURED' | 'BLOCKED' | 'FAILED';

export const TESTNET_CHAIN_ID = 16602;

const secretNames = /(?:key|secret|token|password|credential|private)/i;

export function hostOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function redact(value: string | undefined): string | null {
  return value ? '[REDACTED]' : null;
}

export function safeConfig(env: Record<string, string | undefined>) {
  const allowed = new Set([
    'OG_COMPUTE_ENABLED',
    'OG_COMPUTE_NETWORK',
    'OG_COMPUTE_BASE_URL',
    'OG_COMPUTE_MODEL',
    'OG_STORAGE_ENABLED',
    'OG_STORAGE_NETWORK',
    'OG_STORAGE_MODE',
    'OG_STORAGE_RPC_URL',
    'OG_STORAGE_INDEXER_URL',
    'OG_CHAIN_ENABLED',
    'OG_CHAIN_NETWORK',
    'OG_CHAIN_RPC_URL',
    'OG_CHAIN_CHAIN_ID',
    'OG_CHAIN_EXPLORER_URL',
    'OPTIMIERA_REGISTRY_ADDRESS',
  ]);
  return Object.fromEntries(
    Object.entries(env)
      .filter(([name]) => allowed.has(name))
      .filter(([name]) => !secretNames.test(name))
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([name, value]) => [name, name.endsWith('_URL') ? hostOf(value) : value]),
  );
}

export function networkGate(input: { network?: string; chainId?: number; rpcUrl?: string }): {
  status: LiveStatus;
  reason?: string;
} {
  if (input.network === 'mainnet') return { status: 'BLOCKED', reason: 'MAINNET_NOT_ALLOWED' };
  if (input.chainId !== undefined && input.chainId !== TESTNET_CHAIN_ID)
    return { status: 'BLOCKED', reason: 'TESTNET_CHAIN_ID_REQUIRED' };
  if (input.rpcUrl?.includes('0g.ai') && input.rpcUrl.includes('evmrpc.0g.ai'))
    return { status: 'BLOCKED', reason: 'MAINNET_RPC_NOT_ALLOWED' };
  return { status: 'READY' };
}

export function componentStatus(input: {
  enabled: boolean;
  required: Record<string, boolean>;
  blocked?: string;
  invalid?: string;
}): { status: LiveStatus; missing: string[]; reason?: string } {
  if (input.blocked) return { status: 'BLOCKED', missing: [], reason: input.blocked };
  const missing = Object.entries(input.required)
    .filter(([, present]) => !present)
    .map(([name]) => name);
  if (!input.enabled || missing.length > 0) {
    return { status: 'UNCONFIGURED', missing };
  }
  if (input.invalid) return { status: 'FAILED', missing: [], reason: input.invalid };
  return { status: 'READY', missing: [] };
}

export function activationGate(confirmed: boolean, preflightReady: boolean) {
  if (!confirmed) return { allowed: false, reason: 'CONFIRM_TESTNET_REQUIRED' };
  if (!preflightReady) return { allowed: false, reason: 'PREFLIGHT_NOT_READY' };
  return { allowed: true };
}

export function liveEvidenceStatus(input: {
  authenticatedInference: boolean;
  storageReadback: boolean;
  chainReadback: boolean;
}) {
  return input.authenticatedInference && input.storageReadback && input.chainReadback
    ? 'LIVE_VERIFIED'
    : 'UNCONFIGURED';
}

export function hasSecretLeak(text: string, secrets: string[]) {
  return secrets.filter((secret) => secret.length > 0 && text.includes(secret));
}

export function redactedCredentialSummary(env: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(env)
      .filter(([name]) => secretNames.test(name))
      .map(([name, value]) => [name, redact(value)]),
  );
}
