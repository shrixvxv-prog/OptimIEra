import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  mainnetRegistryConstructorArguments,
  OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT,
  readMainnetRegistryEvidence,
  readMainnetSourceVerification,
} from '@optimiera/og-chain';
import { readRegistryArtifact, verifiedDeployment } from './og-mainnet-readiness';

export async function verifyMainnetSource(args: string[] = process.argv.slice(2)) {
  if (!args.includes('--confirm-source-verification'))
    throw new Error('CONFIRM_SOURCE_VERIFICATION_REQUIRED');
  const artifact = await readRegistryArtifact();
  const deployment = await readMainnetRegistryEvidence(artifact.runtime);
  if (!verifiedDeployment(deployment)) throw new Error('DEPLOYED_BYTECODE_READBACK_FAILED');
  const existing = await readMainnetSourceVerification();
  if (existing.status === 'VERIFIED')
    return { status: 'ALREADY_VERIFIED', liveTransactionPerformed: false, existing } as const;

  const foundryRunner = resolve('scripts/foundry-run.mjs');
  const result = spawnSync(
    process.execPath,
    [
      foundryRunner,
      'verify-contract',
      '--chain-id',
      String(OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.chainId),
      '--verifier',
      'custom',
      '--verifier-url',
      `${OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.explorerUrl}/open/api`,
      '--verifier-api-key',
      'PLACEHOLDER',
      '--compiler-version',
      artifact.compilerVersion,
      '--num-of-optimizations',
      String(artifact.optimizerRuns),
      '--constructor-args',
      mainnetRegistryConstructorArguments(),
      OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.address,
      'src/OptimIEraRegistry.sol:OptimIEraRegistry',
      '--watch',
    ],
    { cwd: resolve('packages/contracts'), stdio: 'inherit', shell: false },
  );
  if (result.status !== 0) throw new Error('MAINNET_SOURCE_VERIFICATION_SUBMISSION_FAILED');
  const verified = await readMainnetSourceVerification();
  if (verified.status !== 'VERIFIED') throw new Error('MAINNET_SOURCE_VERIFICATION_NOT_CONFIRMED');
  return { status: 'VERIFIED', liveTransactionPerformed: false, verified } as const;
}

async function main() {
  try {
    console.log(JSON.stringify(await verifyMainnetSource(), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'MAINNET_SOURCE_VERIFICATION_FAILED');
    process.exitCode = 2;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/og-mainnet-verify-source.ts')) void main();
