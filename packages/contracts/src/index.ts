export const contractStatus = {
  status: 'IMPLEMENTED' as const,
  compilerTarget: 'cancun' as const,
  prefix: 'OptimIEra' as const,
};

export const OPTIMIERA_REGISTRY_ABI = [
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
