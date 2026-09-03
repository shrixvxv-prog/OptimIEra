import { readOGChainConfig, type OGChainConfig } from '@optimiera/config';
import {
  OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT,
  OPTIMIERA_REGISTRY_ABI,
} from '@optimiera/contracts';
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeDeployData,
  http,
  keccak256,
  type Account,
  type Address,
  type Chain,
  type Hash,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { z } from 'zod';

export type ChainHealthState =
  'DISABLED' | 'UNCONFIGURED' | 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
export type ChainErrorCode =
  | 'CHAIN_UNCONFIGURED'
  | 'RPC_UNAVAILABLE'
  | 'WRONG_CHAIN'
  | 'SIGNER_UNCONFIGURED'
  | 'INSUFFICIENT_BALANCE'
  | 'CONTRACT_NOT_DEPLOYED'
  | 'TRANSACTION_REJECTED'
  | 'TRANSACTION_REVERTED'
  | 'RECEIPT_TIMEOUT'
  | 'PROOF_ALREADY_REGISTERED'
  | 'PROOF_NOT_FOUND'
  | 'PROOF_MISMATCH'
  | 'PROOF_REVOKED';

export class ChainError extends Error {
  constructor(
    public readonly code: ChainErrorCode,
    message: string,
  ) {
    super(message);
  }
}
export type ChainHealth = {
  state: ChainHealthState;
  network: string;
  chainId: number;
  rpcHost: string;
  signerConfigured: boolean;
  registryConfigured: boolean;
  deployedBytecode: boolean;
};
export type ProofCommitment = {
  optimizationId: Hex;
  manifestHash: Hex;
  storageRoot: Hex;
  originalPromptHash: Hex;
  optimizedPromptHash: Hex;
  evaluationHash: Hex;
  ownerRefHash: Hex;
  aggregateScore: number;
};
export const proofCommitmentSchema = z.object({
  schemaVersion: z.literal('OptimizationProofCommitmentV1'),
  optimizationId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  manifestHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  storageRoot: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  originalPromptHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  optimizedPromptHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  evaluationHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  ownerRefHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  aggregateScore: z.number().int().min(0).max(100),
  evidenceMode: z.enum(['LOCAL_ENCRYPTED', 'OG_STORAGE']),
  applicationVersion: z.string().min(1),
});
export type OptimizationProofCommitmentV1 = z.infer<typeof proofCommitmentSchema>;

const proofTypes = [
  { type: 'bytes32' },
  { type: 'bytes32' },
  { type: 'bytes32' },
  { type: 'bytes32' },
  { type: 'bytes32' },
  { type: 'bytes32' },
  { type: 'bytes32' },
  { type: 'uint16' },
] as const;
export function hashOwnerReference(workspaceReference: string, userReference: string) {
  return keccak256(
    new TextEncoder().encode(`OptimIEra:owner-ref:V1:${workspaceReference}:${userReference}`),
  );
}
export function createProofId(commitment: ProofCommitment) {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'string' }, ...proofTypes],
      [
        'OptimIEra:OptimizationProof:V1',
        commitment.optimizationId,
        commitment.manifestHash,
        commitment.storageRoot,
        commitment.originalPromptHash,
        commitment.optimizedPromptHash,
        commitment.evaluationHash,
        commitment.ownerRefHash,
        commitment.aggregateScore,
      ],
    ),
  );
}
export function buildProofCommitment(input: Omit<OptimizationProofCommitmentV1, 'schemaVersion'>) {
  return proofCommitmentSchema.parse({ schemaVersion: 'OptimizationProofCommitmentV1', ...input });
}

const chainByNetwork = (config: OGChainConfig): Chain => ({
  id: config.chainId,
  name: config.network === 'testnet' ? '0G Galileo Testnet' : '0G Mainnet',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});

export class OGChainAdapter {
  readonly name = '0G Chain OptimIEra Registry';
  private readonly publicClient;
  private readonly account: Account | undefined;
  private readonly walletClient;
  private readonly chain: Chain;
  constructor(private readonly config: OGChainConfig = readOGChainConfig()) {
    this.chain = chainByNetwork(config);
    this.publicClient = createPublicClient({ chain: this.chain, transport: http(config.rpcUrl) });
    this.account = config.privateKey ? privateKeyToAccount(config.privateKey as Hex) : undefined;
    this.walletClient = this.account
      ? createWalletClient({
          account: this.account,
          chain: this.chain,
          transport: http(config.rpcUrl),
        })
      : undefined;
  }
  private requireRegistry(): Address {
    if (!this.config.registryAddress)
      throw new ChainError('CHAIN_UNCONFIGURED', '0G Chain registry is unconfigured.');
    return this.config.registryAddress as Address;
  }
  private requireWallet() {
    if (!this.walletClient || !this.account)
      throw new ChainError('SIGNER_UNCONFIGURED', '0G Chain registrar is unconfigured.');
    return { wallet: this.walletClient, account: this.account };
  }
  async getNetwork() {
    try {
      const id = await this.publicClient.getChainId();
      if (id !== this.config.chainId)
        throw new ChainError('WRONG_CHAIN', 'Configured 0G Chain ID does not match the RPC.');
      return { network: this.config.network, chainId: id };
    } catch (error) {
      if (error instanceof ChainError) throw error;
      throw new ChainError('RPC_UNAVAILABLE', '0G Chain network query failed.');
    }
  }
  async getBlockNumber() {
    try {
      return await this.publicClient.getBlockNumber();
    } catch {
      throw new ChainError('RPC_UNAVAILABLE', '0G Chain block query failed.');
    }
  }
  async getSignerBalance() {
    const { account } = this.requireWallet();
    try {
      return await this.publicClient.getBalance({ address: account.address });
    } catch {
      throw new ChainError('RPC_UNAVAILABLE', '0G Chain balance query failed.');
    }
  }
  async getContractStatus() {
    const address = this.requireRegistry();
    try {
      const code = await this.publicClient.getBytecode({ address });
      if (!code || code === '0x')
        throw new ChainError(
          'CONTRACT_NOT_DEPLOYED',
          'Configured registry has no deployed bytecode.',
        );
      return { address, deployedBytecode: true };
    } catch (error) {
      if (error instanceof ChainError) throw error;
      throw new ChainError('RPC_UNAVAILABLE', '0G Chain registry query failed.');
    }
  }
  async healthCheck(): Promise<ChainHealth> {
    const base = {
      network: this.config.network,
      chainId: this.config.chainId,
      rpcHost: new URL(this.config.rpcUrl).host,
      signerConfigured: Boolean(this.config.privateKey),
      registryConfigured: Boolean(this.config.registryAddress),
      deployedBytecode: false,
    };
    if (!this.config.privateKey || !this.config.registryAddress)
      return { ...base, state: 'UNCONFIGURED' };
    try {
      await this.getNetwork();
      const status = await this.getContractStatus();
      return { ...base, ...status, state: 'AVAILABLE' };
    } catch (error) {
      return {
        ...base,
        state:
          error instanceof ChainError && error.code === 'WRONG_CHAIN' ? 'DEGRADED' : 'UNAVAILABLE',
      };
    }
  }
  async registerProof(commitment: ProofCommitment) {
    const { wallet, account } = this.requireWallet();
    const address = this.requireRegistry();
    await this.getContractStatus();
    const id = createProofId(commitment);
    try {
      const hash = await wallet.writeContract({
        address,
        abi: OPTIMIERA_REGISTRY_ABI,
        functionName: 'registerProof',
        args: [
          commitment.optimizationId,
          commitment.manifestHash,
          commitment.storageRoot,
          commitment.originalPromptHash,
          commitment.optimizedPromptHash,
          commitment.evaluationHash,
          commitment.ownerRefHash,
          commitment.aggregateScore,
        ],
        account,
        chain: this.chain,
      });
      return { proofId: id, txHash: hash, contractAddress: address, registrar: account.address };
    } catch (error) {
      const message = String(error).toLowerCase();
      if (message.includes('duplicate'))
        throw new ChainError('PROOF_ALREADY_REGISTERED', 'Proof is already registered.');
      if (message.includes('rejected') || message.includes('denied'))
        throw new ChainError('TRANSACTION_REJECTED', '0G Chain transaction was rejected.');
      throw new ChainError('TRANSACTION_REVERTED', '0G Chain proof registration reverted.');
    }
  }
  async waitForReceipt(txHash: Hash) {
    try {
      return await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: this.config.confirmations,
      });
    } catch {
      throw new ChainError('RECEIPT_TIMEOUT', '0G Chain receipt confirmation timed out.');
    }
  }
  async getTransactionReceipt(txHash: Hash) {
    try {
      return await this.publicClient.getTransactionReceipt({ hash: txHash });
    } catch {
      throw new ChainError('RPC_UNAVAILABLE', '0G Chain receipt query failed.');
    }
  }
  async getProof(proofId: Hex) {
    try {
      return await this.publicClient.readContract({
        address: this.requireRegistry(),
        abi: OPTIMIERA_REGISTRY_ABI,
        functionName: 'getProof',
        args: [proofId],
      });
    } catch {
      throw new ChainError('PROOF_NOT_FOUND', 'Onchain proof was not found.');
    }
  }
  async verifyProof(proofId: Hex, commitment: ProofCommitment) {
    const actual = await this.publicClient.readContract({
      address: this.requireRegistry(),
      abi: OPTIMIERA_REGISTRY_ABI,
      functionName: 'verifyProof',
      args: [
        proofId,
        commitment.manifestHash,
        commitment.storageRoot,
        commitment.originalPromptHash,
        commitment.optimizedPromptHash,
        commitment.evaluationHash,
        commitment.ownerRefHash,
        commitment.aggregateScore,
      ],
    });
    if (!actual)
      throw new ChainError('PROOF_MISMATCH', 'Onchain proof values did not match the commitment.');
    return true;
  }
  async revokeProof(proofId: Hex, reasonHash: Hex) {
    const { wallet, account } = this.requireWallet();
    try {
      return await wallet.writeContract({
        address: this.requireRegistry(),
        abi: OPTIMIERA_REGISTRY_ABI,
        functionName: 'revokeProof',
        args: [proofId, reasonHash],
        account,
        chain: this.chain,
      });
    } catch {
      throw new ChainError('TRANSACTION_REVERTED', '0G Chain proof revocation reverted.');
    }
  }
}

export type MainnetRegistryEvidence = {
  checkedAt: string;
  chainId: number;
  currentBlock: string;
  transactionFound: boolean;
  receiptStatus: 'success' | 'reverted';
  receiptBlock: string;
  deployedBytecode: boolean;
  runtimeBytecodeBytes: number;
  runtimeBytecodeHash: Hex;
  expectedBytecodeMatch: boolean | null;
  deployerBalanceWei: string;
  adminRoleVerified: boolean;
  registrarRoleVerified: boolean;
  paused: boolean;
};

export async function readMainnetRegistryEvidence(
  expectedRuntimeBytecode?: Hex,
): Promise<MainnetRegistryEvidence> {
  const deployment = OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT;
  const chain: Chain = {
    id: deployment.chainId,
    name: deployment.networkName,
    nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
    rpcUrls: { default: { http: [deployment.rpcUrl] } },
  };
  const client = createPublicClient({ chain, transport: http(deployment.rpcUrl) });
  const chainId = await client.getChainId();
  if (chainId !== deployment.chainId)
    throw new ChainError('WRONG_CHAIN', '0G Mainnet RPC returned an unexpected chain ID.');
  const [currentBlock, transaction, receipt, code, deployerBalance, adminRole, registrarRole, paused] =
    await Promise.all([
      client.getBlockNumber(),
      client.getTransaction({ hash: deployment.transactionHash }),
      client.getTransactionReceipt({ hash: deployment.transactionHash }),
      client.getBytecode({ address: deployment.address }),
      client.getBalance({ address: deployment.deployer }),
      client.readContract({
        address: deployment.address,
        abi: OPTIMIERA_REGISTRY_ABI,
        functionName: 'hasRole',
        args: [`0x${'0'.repeat(64)}`, deployment.admin],
      }),
      client.readContract({
        address: deployment.address,
        abi: OPTIMIERA_REGISTRY_ABI,
        functionName: 'hasRole',
        args: [keccak256(new TextEncoder().encode('OPTIMIERA_REGISTRAR_ROLE')), deployment.registrar],
      }),
      client.readContract({
        address: deployment.address,
        abi: OPTIMIERA_REGISTRY_ABI,
        functionName: 'paused',
      }),
    ]);
  if (!code || code === '0x')
    throw new ChainError('CONTRACT_NOT_DEPLOYED', '0G Mainnet registry bytecode is missing.');
  return {
    checkedAt: new Date().toISOString(),
    chainId,
    currentBlock: currentBlock.toString(),
    transactionFound:
      transaction.hash.toLowerCase() === deployment.transactionHash.toLowerCase() &&
      transaction.to === null,
    receiptStatus: receipt.status,
    receiptBlock: receipt.blockNumber.toString(),
    deployedBytecode: true,
    runtimeBytecodeBytes: (code.length - 2) / 2,
    runtimeBytecodeHash: keccak256(code),
    expectedBytecodeMatch: expectedRuntimeBytecode
      ? code.toLowerCase() === expectedRuntimeBytecode.toLowerCase()
      : null,
    deployerBalanceWei: deployerBalance.toString(),
    adminRoleVerified: adminRole,
    registrarRoleVerified: registrarRole,
    paused,
  };
}

export function serverSignerAddress(privateKey: string): Address {
  const normalized = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(normalized))
    throw new ChainError('SIGNER_UNCONFIGURED', 'Server-side signer configuration is invalid.');
  return privateKeyToAccount(normalized as Hex).address;
}

export function mainnetRegistryConstructorArguments() {
  return encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }],
    [
      OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.admin,
      OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.registrar,
    ],
  );
}

export async function readMainnetBalance(address: Address) {
  const deployment = OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT;
  const client = createPublicClient({ transport: http(deployment.rpcUrl) });
  const chainId = await client.getChainId();
  if (chainId !== deployment.chainId)
    throw new ChainError('WRONG_CHAIN', '0G Mainnet RPC returned an unexpected chain ID.');
  return (await client.getBalance({ address })).toString();
}

export async function estimateMainnetRegistryDeployment(
  creationBytecode: Hex,
  deployer: Address = OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.deployer,
  registrar: Address = OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.registrar,
) {
  const deployment = OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT;
  const chain: Chain = {
    id: deployment.chainId,
    name: deployment.networkName,
    nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
    rpcUrls: { default: { http: [deployment.rpcUrl] } },
  };
  const client = createPublicClient({ chain, transport: http(deployment.rpcUrl) });
  const data = encodeDeployData({
    abi: OPTIMIERA_REGISTRY_ABI,
    bytecode: creationBytecode,
    args: [deployer, registrar],
  });
  const [gas, gasPrice] = await Promise.all([
    client.estimateGas({ account: deployer, data }),
    client.getGasPrice(),
  ]);
  return {
    estimatedGas: gas.toString(),
    gasPriceWei: gasPrice.toString(),
    estimatedRequirementWei: (gas * gasPrice).toString(),
  };
}

export async function readMainnetSourceVerification(fetchImpl: typeof fetch = fetch) {
  try {
    const response = await fetchImpl(
      `${OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.explorerUrl}/open/api?module=contract&action=getsourcecode&address=${OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.address}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) return { status: 'UNAVAILABLE' as const, contractName: null };
    const body = (await response.json()) as {
      result?: Array<{ SourceCode?: unknown; ABI?: unknown; ContractName?: unknown }>;
    };
    const result = body.result?.[0];
    const verified =
      typeof result?.SourceCode === 'string' &&
      result.SourceCode.trim().length > 0 &&
      result.ABI !== 'Contract source code not verified';
    return {
      status: verified ? ('VERIFIED' as const) : ('UNVERIFIED' as const),
      contractName:
        verified && typeof result?.ContractName === 'string' ? result.ContractName : null,
    };
  } catch {
    return { status: 'UNAVAILABLE' as const, contractName: null };
  }
}

export interface ChainAdapter {
  healthCheck(): Promise<ChainHealth>;
  getNetwork(): Promise<{ network: string; chainId: number }>;
  registerProof(
    commitment: ProofCommitment,
  ): Promise<{ proofId: Hex; txHash: Hash; contractAddress?: Address; registrar?: Address }>;
  waitForReceipt(txHash: Hash): Promise<unknown>;
  getProof(proofId: Hex): Promise<unknown>;
  verifyProof(proofId: Hex, commitment: ProofCommitment): Promise<boolean>;
  revokeProof(proofId: Hex, reasonHash: Hex): Promise<Hash>;
  getTransactionReceipt(txHash: Hash): Promise<unknown>;
}

export const solidityPrefix = 'OptimIEra';

export { OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT };

// The test adapter is imported only by NODE_ENV=test code paths.
export { TestChainAdapter } from './test-adapter';
