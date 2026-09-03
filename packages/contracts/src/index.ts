export const contractStatus = {
  status: 'IMPLEMENTED' as const,
  compilerTarget: 'cancun' as const,
  prefix: 'OptimIEra' as const,
};

/** Factual deployment evidence independently read back from 0G Mainnet. */
export const OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT = {
  network: 'mainnet',
  networkName: '0G Mainnet (Aristotle)',
  chainId: 16661,
  rpcUrl: 'https://evmrpc.0g.ai',
  explorerUrl: 'https://chainscan.0g.ai',
  address: '0xda91a3929107c74f27e2d3288d046e4a37f9b422',
  transactionHash: '0x81480a3c4a8a21d015be2d357151d2795b48f54254f085f9612bf970b6fbb1fb',
  blockNumber: 43_156_090,
  deployedAt: '2026-08-31T17:29:26Z',
  deployer: '0x970655340131ee0e297b96afc9c98bee854fc4df',
  admin: '0x970655340131ee0e297b96afc9c98bee854fc4df',
  registrar: '0xf58b0ADBE671AE7d5B224600700eB4d4A0105c46',
  runtimeBytecodeBytes: 3908,
} as const;

export const OPTIMIERA_REGISTRY_ABI = [
  {
    type: 'constructor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'admin', type: 'address' },
      { name: 'registrar', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'hasRole',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'registerProof',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'optimizationId', type: 'bytes32' },
      { name: 'manifestHash', type: 'bytes32' },
      { name: 'storageRoot', type: 'bytes32' },
      { name: 'originalPromptHash', type: 'bytes32' },
      { name: 'optimizedPromptHash', type: 'bytes32' },
      { name: 'evaluationHash', type: 'bytes32' },
      { name: 'ownerRefHash', type: 'bytes32' },
      { name: 'aggregateScore', type: 'uint16' },
    ],
    outputs: [{ name: 'proofId', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'getProof',
    stateMutability: 'view',
    inputs: [{ name: 'proofId', type: 'bytes32' }],
    outputs: [
      { name: 'optimizationId', type: 'bytes32' },
      { name: 'manifestHash', type: 'bytes32' },
      { name: 'storageRoot', type: 'bytes32' },
      { name: 'originalPromptHash', type: 'bytes32' },
      { name: 'optimizedPromptHash', type: 'bytes32' },
      { name: 'evaluationHash', type: 'bytes32' },
      { name: 'ownerRefHash', type: 'bytes32' },
      { name: 'registrar', type: 'address' },
      { name: 'aggregateScore', type: 'uint16' },
      { name: 'createdAt', type: 'uint64' },
      { name: 'status', type: 'uint8' },
    ],
  },
  {
    type: 'function',
    name: 'verifyProof',
    stateMutability: 'view',
    inputs: [
      { name: 'proofId', type: 'bytes32' },
      { name: 'manifestHash', type: 'bytes32' },
      { name: 'storageRoot', type: 'bytes32' },
      { name: 'originalPromptHash', type: 'bytes32' },
      { name: 'optimizedPromptHash', type: 'bytes32' },
      { name: 'evaluationHash', type: 'bytes32' },
      { name: 'ownerRefHash', type: 'bytes32' },
      { name: 'aggregateScore', type: 'uint16' },
    ],
    outputs: [{ name: 'valid', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'revokeProof',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proofId', type: 'bytes32' },
      { name: 'reasonHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'ProofRegistered',
    inputs: [
      { name: 'proofId', type: 'bytes32', indexed: true },
      { name: 'optimizationId', type: 'bytes32', indexed: true },
      { name: 'registrar', type: 'address', indexed: true },
      { name: 'manifestHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ProofRevoked',
    inputs: [
      { name: 'proofId', type: 'bytes32', indexed: true },
      { name: 'reasonHash', type: 'bytes32', indexed: false },
    ],
  },
] as const;
