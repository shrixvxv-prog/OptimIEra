import { db } from '@optimiera/database';
import {
  readUsagePaymentConfig,
  UsagePaymentError,
  verifyUsagePaymentTransaction,
} from '@optimiera/payment';

export async function consumeUsagePayment(input: {
  txHash?: string;
  userId: string;
  workspaceId: string;
  operation: string;
  idempotencyKey?: string;
}) {
  const config = readUsagePaymentConfig();
  if (!config.enabled) return null;
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!idempotencyKey) throw new UsagePaymentError('PAYMENT_REQUIRED');
  const existing = await db.usagePayment.findUnique({
    where: {
      userId_idempotencyKey: {
        userId: input.userId,
        idempotencyKey,
      },
    },
  });
  if (existing) {
    if (existing.operation !== input.operation) throw new UsagePaymentError('PAYMENT_ALREADY_USED');
    return existing;
  }
  if (!input.txHash) throw new UsagePaymentError('PAYMENT_REQUIRED');
  const evidence = await verifyUsagePaymentTransaction(input.txHash, config);
  if (!evidence) return null;
  const [identities, addresses] = await Promise.all([
    db.walletIdentity.findMany({ where: { userId: input.userId } }),
    db.walletAddress.findMany({ where: { userId: input.userId } }),
  ]);
  const payer = evidence.payerAddress.toLowerCase();
  const ownsPayer =
    identities.some((wallet) => wallet.normalizedAddress.toLowerCase() === payer) ||
    addresses.some((wallet) => wallet.address.toLowerCase() === payer);
  if (!ownsPayer) throw new UsagePaymentError('PAYMENT_PAYER_MISMATCH');
  try {
    return await db.usagePayment.create({
      data: {
        txHash: input.txHash.toLowerCase(),
        userId: input.userId,
        workspaceId: input.workspaceId,
        operation: input.operation,
        idempotencyKey,
        chainId: evidence.chainId,
        payerAddress: evidence.payerAddress.toLowerCase(),
        recipientAddress: evidence.recipientAddress.toLowerCase(),
        amountWei: evidence.amountWei.toString(),
      },
    });
  } catch {
    const used = await db.usagePayment.findUnique({
      where: { txHash: input.txHash.toLowerCase() },
    });
    if (
      used?.userId === input.userId &&
      used.idempotencyKey === idempotencyKey &&
      used.operation === input.operation
    )
      return used;
    throw new UsagePaymentError('PAYMENT_ALREADY_USED');
  }
}
