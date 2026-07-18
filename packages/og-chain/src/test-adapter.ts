import { createProofId, type ChainAdapter, type ChainHealth, type ProofCommitment } from './index';
import type { Hash, Hex } from 'viem';

/** Test-only deterministic chain adapter. Never use for live 0G Chain. */
export class TestChainAdapter implements ChainAdapter {
  readonly name = 'TestChainAdapter';
  readonly contractAddress = '0x0000000000000000000000000000000000000505' as const;
  readonly registrar = '0x0000000000000000000000000000000000000506' as const;
  private readonly proofs = new Map<string, ProofCommitment>();
  private readonly submitted = new Set<string>();
  private readonly shouldTimeoutOnce: boolean;
  private timeoutUsed = false;
  constructor(options: { timeoutOnce?: boolean } = {}) {
    this.shouldTimeoutOnce = Boolean(options.timeoutOnce);
  }
  async healthCheck(): Promise<ChainHealth> {
    return {
      state: 'AVAILABLE',
      network: 'test-adapter',
      chainId: 31337,
      rpcHost: 'test-adapter.invalid',
      signerConfigured: false,
      registryConfigured: true,
      deployedBytecode: true,
    };
  }
  async getNetwork() {
    return { network: 'test-adapter', chainId: 31337 };
  }
  async registerProof(commitment: ProofCommitment) {
    const proofId = createProofId(commitment);
    if (this.proofs.has(proofId)) throw new Error('PROOF_ALREADY_REGISTERED');
    this.proofs.set(proofId, commitment);
    this.submitted.add(proofId);
    return {
      proofId,
      txHash: `0x${'a'.repeat(64)}` as Hash,
      contractAddress: this.contractAddress,
      registrar: this.registrar,
    };
  }
  async waitForReceipt(_txHash: Hash) {
    if (this.shouldTimeoutOnce && !this.timeoutUsed) {
      this.timeoutUsed = true;
      throw new Error('RECEIPT_TIMEOUT');
    }
    return {
      status: 'success',
      blockNumber: 505n,
      blockHash: `0x${'b'.repeat(64)}` as Hash,
      confirmations: 3,
    };
  }
  async getProof(proofId: Hex) {
    const commitment = this.proofs.get(proofId);
    if (!commitment) throw new Error('PROOF_NOT_FOUND');
    return commitment;
  }
  async verifyProof(proofId: Hex, commitment: ProofCommitment) {
    const actual = await this.getProof(proofId);
    if (JSON.stringify(actual) !== JSON.stringify(commitment)) throw new Error('PROOF_MISMATCH');
    return true;
  }
  async revokeProof(proofId: Hex, _reasonHash: Hex) {
    if (!this.proofs.has(proofId)) throw new Error('PROOF_NOT_FOUND');
    this.proofs.delete(proofId);
    return `0x${'c'.repeat(64)}` as Hash;
  }
  async getTransactionReceipt(_txHash: Hash) {
    return { status: 'success', blockNumber: 505n };
  }
  wasSubmitted(proofId: Hex) {
    return this.submitted.has(proofId);
  }
}
