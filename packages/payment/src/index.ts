export type PaymentResponse = {
  state: 'unconfigured' | 'unavailable' | 'ready';
  requestId?: string;
  receiptId?: string;
  reason?: string;
};
export interface PaymentAdapter {
  healthCheck(): Promise<PaymentResponse>;
  quote(request: { operation: string; units: number }): Promise<PaymentResponse>;
  createPaymentRequest(request: { operation: string; units: number }): Promise<PaymentResponse>;
  verifyPayment(requestId: string): Promise<PaymentResponse>;
  getReceipt(receiptId: string): Promise<PaymentResponse>;
}
export const paymentIntegration = {
  status: 'READY' as const,
  note: 'Native 0G testnet usage transfers are verified server-side before paid AI operations.',
};

import {
  createPublicClient,
  http,
  isAddress,
  type Address,
  type Hash,
  type Transaction,
  type TransactionReceipt,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const DEFAULT_USAGE_PAYMENT_WEI = 100_000_000_000_000n;

export type UsagePaymentConfig = {
  enabled: boolean;
  chainId: number;
  rpcUrl: string;
  recipient?: Address;
  amountWei: bigint;
  confirmations: number;
};

export class UsagePaymentError extends Error {
  constructor(
    public readonly code:
      | 'PAYMENT_REQUIRED'
      | 'PAYMENT_CONFIGURATION_INVALID'
      | 'PAYMENT_CHAIN_MISMATCH'
      | 'PAYMENT_RECIPIENT_MISMATCH'
      | 'PAYMENT_AMOUNT_INSUFFICIENT'
      | 'PAYMENT_FAILED'
      | 'PAYMENT_PAYER_MISMATCH'
      | 'PAYMENT_ALREADY_USED',
  ) {
    super(code);
  }
}

export function readUsagePaymentConfig(
  env: Record<string, string | undefined> = process.env,
): UsagePaymentConfig {
  const recipient = env.OG_USAGE_PAYMENT_RECIPIENT;
  const signerKey = env.OPTIMIERA_CHAIN_PRIVATE_KEY;
  const derivedRecipient =
    signerKey && /^(0x)?[0-9a-fA-F]{64}$/.test(signerKey)
      ? privateKeyToAccount(
          (signerKey.startsWith('0x') ? signerKey : `0x${signerKey}`) as `0x${string}`,
        ).address
      : undefined;
  const amount = env.OG_USAGE_PAYMENT_AMOUNT_WEI
    ? BigInt(env.OG_USAGE_PAYMENT_AMOUNT_WEI)
    : DEFAULT_USAGE_PAYMENT_WEI;
  const config = {
    enabled: env.OPTIMIERA_USAGE_PAYMENTS_ENABLED === 'true',
    chainId: env.OG_CHAIN_CHAIN_ID ? Number(env.OG_CHAIN_CHAIN_ID) : 16602,
    rpcUrl: env.OG_CHAIN_RPC_URL || 'https://evmrpc-testnet.0g.ai',
    recipient: recipient && isAddress(recipient) ? (recipient as Address) : derivedRecipient,
    amountWei: amount,
    confirmations: env.OG_CHAIN_CONFIRMATIONS ? Number(env.OG_CHAIN_CONFIRMATIONS) : 1,
  };
  if (
    config.enabled &&
    (!config.recipient || config.chainId !== 16602 || config.amountWei < DEFAULT_USAGE_PAYMENT_WEI)
  )
    throw new UsagePaymentError('PAYMENT_CONFIGURATION_INVALID');
  return config;
}

export function validateUsagePaymentEvidence(
  config: UsagePaymentConfig,
  transaction: Pick<Transaction, 'to' | 'from' | 'value' | 'chainId'>,
  receipt: Pick<TransactionReceipt, 'status'>,
) {
  if (receipt.status !== 'success') throw new UsagePaymentError('PAYMENT_FAILED');
  if (transaction.chainId !== config.chainId) throw new UsagePaymentError('PAYMENT_CHAIN_MISMATCH');
  if (!transaction.to || transaction.to.toLowerCase() !== config.recipient?.toLowerCase())
    throw new UsagePaymentError('PAYMENT_RECIPIENT_MISMATCH');
  if (transaction.value < config.amountWei)
    throw new UsagePaymentError('PAYMENT_AMOUNT_INSUFFICIENT');
  return {
    payerAddress: transaction.from,
    recipientAddress: transaction.to,
    amountWei: transaction.value,
    chainId: transaction.chainId,
  };
}

export async function verifyUsagePaymentTransaction(
  txHash: string,
  config: UsagePaymentConfig = readUsagePaymentConfig(),
) {
  if (!config.enabled) return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new UsagePaymentError('PAYMENT_REQUIRED');
  const client = createPublicClient({
    transport: http(config.rpcUrl),
    chain: {
      id: config.chainId,
      name: '0G Galileo Testnet',
      nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    },
  });
  try {
    const hash = txHash as Hash;
    const [transaction, receipt] = await Promise.all([
      client.getTransaction({ hash }),
      client.waitForTransactionReceipt({
        hash,
        confirmations: config.confirmations,
        timeout: 60_000,
      }),
    ]);
    return validateUsagePaymentEvidence(config, transaction, receipt);
  } catch (error) {
    if (error instanceof UsagePaymentError) throw error;
    throw new UsagePaymentError('PAYMENT_FAILED');
  }
}
