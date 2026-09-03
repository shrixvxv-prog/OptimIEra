import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { inspectMainnetEnvironment } from '@optimiera/config';
import {
  estimateMainnetRegistryDeployment,
  OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT,
  readMainnetBalance,
  readMainnetRegistryEvidence,
  readMainnetSourceVerification,
  serverSignerAddress,
} from '@optimiera/og-chain';

loadEnv({ quiet: true });

type ContractArtifact = {
  bytecode?: { object?: string };
  deployedBytecode?: { object?: string };
  metadata?: {
    compiler?: { version?: string };
    settings?: { optimizer?: { runs?: number }; evmVersion?: string };
  };
};
type Hex = `0x${string}`;

export async function readRegistryArtifact() {
  const path = resolve('packages/contracts/out/OptimIEraRegistry.sol/OptimIEraRegistry.json');
  const artifact = JSON.parse(await readFile(path, 'utf8')) as ContractArtifact;
  const creation = artifact.bytecode?.object;
  const runtime = artifact.deployedBytecode?.object;
  if (!creation?.startsWith('0x') || !runtime?.startsWith('0x'))
    throw new Error('CONTRACT_ARTIFACT_MISSING');
  return {
    creation: creation as Hex,
    runtime: runtime as Hex,
    compilerVersion: artifact.metadata?.compiler?.version ?? '0.8.24',
    optimizerRuns: artifact.metadata?.settings?.optimizer?.runs ?? 200,
    evmVersion: artifact.metadata?.settings?.evmVersion ?? 'cancun',
  };
}

export function verifiedDeployment(
  evidence: Awaited<ReturnType<typeof readMainnetRegistryEvidence>>,
) {
  return (
    evidence.chainId === OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.chainId &&
    evidence.transactionFound &&
    evidence.receiptStatus === 'success' &&
    evidence.receiptBlock === String(OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.blockNumber) &&
    evidence.deployedBytecode &&
    evidence.runtimeBytecodeBytes ===
      OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.runtimeBytecodeBytes &&
    evidence.expectedBytecodeMatch === true &&
    evidence.adminRoleVerified &&
    evidence.registrarRoleVerified &&
    !evidence.paused
  );
}

export async function buildMainnetReadinessReport(
  env: Record<string, string | undefined> = process.env,
) {
  const artifact = await readRegistryArtifact();
  const environment = inspectMainnetEnvironment(env);
  let configuredDeployer: `0x${string}` | null = null;
  try {
    configuredDeployer = env.OPTIMIERA_DEPLOYER_PRIVATE_KEY
      ? serverSignerAddress(env.OPTIMIERA_DEPLOYER_PRIVATE_KEY)
      : null;
  } catch {
    configuredDeployer = null;
  }
  const estimateDeployer = configuredDeployer ?? OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.deployer;
  const estimateRegistrar =
    (environment.safe.registrarAddress as `0x${string}` | null) ??
    OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.registrar;
  const [deployment, sourceVerification, estimate, configuredDeployerBalanceWei] =
    await Promise.all([
    readMainnetRegistryEvidence(artifact.runtime),
    readMainnetSourceVerification(),
    estimateMainnetRegistryDeployment(
      artifact.creation,
      estimateDeployer,
      estimateRegistrar,
    ).catch(() => null),
    configuredDeployer ? readMainnetBalance(configuredDeployer).catch(() => null) : null,
  ]);
  const deploymentVerified = verifiedDeployment(deployment);
  const estimatedRequirement = estimate ? BigInt(estimate.estimatedRequirementWei) : null;
  const fundedForEstimate = estimatedRequirement
    ? BigInt(configuredDeployerBalanceWei ?? deployment.deployerBalanceWei) >= estimatedRequirement
    : null;
  const status =
    environment.status !== 'READY'
      ? 'MAINNET_APPLICATION_UNCONFIGURED'
      : deploymentVerified
        ? 'DEPLOYED_READBACK_VERIFIED'
        : fundedForEstimate
          ? 'READY_FOR_MANUAL_DEPLOYMENT'
          : 'BLOCKED';
  return {
    schemaVersion: 'OptimIEraMainnetReadinessV1',
    status,
    liveWritesPerformed: false,
    environment: {
      ...environment,
      configuredDeployerAddress: configuredDeployer,
      configuredDeployerBalanceWei,
    },
    deployment: {
      ...OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT,
      readback: deployment,
      verified: deploymentVerified,
      sourceVerification,
    },
    estimate: estimate ? { ...estimate, fundedForEstimate } : null,
  };
}

async function main() {
  try {
    const report = await buildMainnetReadinessReport();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === 'BLOCKED' ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'MAINNET_PREFLIGHT_FAILED');
    process.exitCode = 2;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/og-mainnet-readiness.ts')) void main();
