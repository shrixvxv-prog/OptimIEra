import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { inspectMainnetEnvironment, readOGChainConfig } from '@optimiera/config';
import {
  OGChainAdapter,
  OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT,
  proofCommitmentSchema,
  readMainnetRegistryEvidence,
  readMainnetSourceVerification,
} from '@optimiera/og-chain';
import { readRegistryArtifact, verifiedDeployment } from './og-mainnet-readiness';

loadEnv({ quiet: true });

async function safeCommitmentFile(fileName: string) {
  if (isAbsolute(fileName)) throw new Error('MAINNET_COMMITMENT_PATH_MUST_BE_RELATIVE');
  const root = await realpath(process.cwd());
  const candidate = await realpath(resolve(root, fileName));
  const contained = relative(root, candidate);
  if (!contained || contained.startsWith('..') || isAbsolute(contained))
    throw new Error('MAINNET_COMMITMENT_PATH_OUTSIDE_WORKSPACE');
  const commitment = proofCommitmentSchema.parse(JSON.parse(await readFile(candidate, 'utf8')));
  if (commitment.evidenceMode !== 'OG_STORAGE' || /^0x0{64}$/i.test(commitment.storageRoot))
    throw new Error('MAINNET_COMMITMENT_REQUIRES_VERIFIED_STORAGE');
  return commitment;
}

export async function runMainnetSmoke(
  args: string[] = process.argv.slice(2),
  env: Record<string, string | undefined> = process.env,
) {
  const writeRequested = args.includes('--confirm-mainnet-commitment');
  if (writeRequested && env.OPTIMIERA_MAINNET_SMOKE_WRITE_ENABLED !== 'true')
    throw new Error('MAINNET_SMOKE_WRITE_OPT_IN_REQUIRED');
  const artifact = await readRegistryArtifact();
  const [registry, sourceVerification] = await Promise.all([
    readMainnetRegistryEvidence(artifact.runtime),
    readMainnetSourceVerification(),
  ]);
  const readOnlyVerified = verifiedDeployment(registry);
  if (!writeRequested)
    return {
      schemaVersion: 'OptimIEraMainnetSmokeV1',
      status: readOnlyVerified ? 'READ_ONLY_VERIFIED' : 'READ_ONLY_FAILED',
      liveWritesPerformed: false,
      network: 'MAINNET',
      chainId: OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.chainId,
      registry: OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.address,
      readback: registry,
      sourceVerification,
      controlledCommitment: { status: 'NOT_REQUESTED' },
    };

  const environment = inspectMainnetEnvironment(env);
  if (environment.status !== 'READY') throw new Error('MAINNET_ENVIRONMENT_NOT_READY');
  if (
    env.OPTIMIERA_REGISTRY_ADDRESS?.toLowerCase() !==
    OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.address.toLowerCase()
  )
    throw new Error('MAINNET_REGISTRY_ADDRESS_MISMATCH');
  if (!env.OPTIMIERA_MAINNET_SMOKE_COMMITMENT_FILE)
    throw new Error('MAINNET_SMOKE_COMMITMENT_FILE_REQUIRED');
  const commitment = await safeCommitmentFile(env.OPTIMIERA_MAINNET_SMOKE_COMMITMENT_FILE);
  const adapter = new OGChainAdapter(readOGChainConfig(env));
  const submitted = await adapter.registerProof(commitment);
  const receipt = (await adapter.waitForReceipt(submitted.txHash)) as {
    status?: string;
    blockNumber?: bigint;
  };
  if (receipt.status !== 'success') throw new Error('MAINNET_SMOKE_TRANSACTION_REVERTED');
  await adapter.verifyProof(submitted.proofId, commitment);
  return {
    schemaVersion: 'OptimIEraMainnetSmokeV1',
    status: 'CONTROLLED_COMMITMENT_VERIFIED',
    liveWritesPerformed: true,
    network: 'MAINNET',
    chainId: OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.chainId,
    registry: OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.address,
    readback: registry,
    sourceVerification,
    controlledCommitment: {
      status: 'VERIFIED',
      proofId: submitted.proofId,
      transactionHash: submitted.txHash,
      blockNumber: receipt.blockNumber?.toString() ?? null,
    },
  };
}

async function main() {
  try {
    const result = await runMainnetSmoke();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status.endsWith('FAILED') ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'MAINNET_SMOKE_FAILED');
    process.exitCode = 2;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/og-mainnet-smoke.ts')) void main();
