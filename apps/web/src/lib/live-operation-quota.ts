import 'server-only';

import { randomUUID } from 'node:crypto';
import { db } from '@optimiera/database';
import {
  readPublicLive0GConfig,
  type LiveOperation,
  type PublicLive0GConfig,
} from '@optimiera/config';

function utcDayStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function quotaError(scope: 'USER' | 'GLOBAL') {
  return new Error(
    scope === 'USER' ? 'LIVE_0G_USER_QUOTA_EXCEEDED' : 'LIVE_0G_GLOBAL_QUOTA_EXCEEDED',
  );
}

export async function reserveLiveOperation(input: {
  userId: string;
  workspaceId: string;
  operation: LiveOperation;
  idempotencyKey: string;
  requestId?: string;
  config?: PublicLive0GConfig;
}) {
  const config = input.config ?? readPublicLive0GConfig();
  if (!config.enabled) throw new Error('LIVE_WRITES_DISABLED');
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey) throw new Error('VALIDATION_ERROR');
  const requestId = input.requestId?.trim() || randomUUID();
  const dayStart = utcDayStart();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const existing = await tx.liveOperationUsage.findUnique({
            where: {
              userId_operation_idempotencyKey: {
                userId: input.userId,
                operation: input.operation,
                idempotencyKey,
              },
            },
          });
          if (existing) return existing;
          const [userCount, globalCount] = await Promise.all([
            tx.liveOperationUsage.count({
              where: { userId: input.userId, operation: input.operation, dayStart },
            }),
            tx.liveOperationUsage.count({
              where: { operation: input.operation, dayStart },
            }),
          ]);
          if (userCount >= config.userDailyLimits[input.operation]) throw quotaError('USER');
          if (globalCount >= config.globalDailyLimits[input.operation]) throw quotaError('GLOBAL');
          return tx.liveOperationUsage.create({
            data: {
              userId: input.userId,
              workspaceId: input.workspaceId,
              operation: input.operation,
              dayStart,
              idempotencyKey,
              requestId,
            },
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;
      if ((code === 'P2034' || code === 'P2002') && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error('LIVE_0G_QUOTA_CONFLICT');
}

export async function completeLiveOperation(id: string) {
  return db.liveOperationUsage.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}

export async function getLiveOperationQuotaSnapshot(userId?: string) {
  const config = readPublicLive0GConfig();
  const dayStart = utcDayStart();
  const operations: LiveOperation[] = ['COMPUTE', 'STORAGE', 'CHAIN'];
  const rows = await Promise.all(
    operations.map(async (operation) => {
      const [globalUsed, userUsed] = await Promise.all([
        db.liveOperationUsage.count({ where: { operation, dayStart } }),
        userId
          ? db.liveOperationUsage.count({ where: { userId, operation, dayStart } })
          : Promise.resolve(0),
      ]);
      return [
        operation,
        {
          userUsed,
          userLimit: config.userDailyLimits[operation],
          globalUsed,
          globalLimit: config.globalDailyLimits[operation],
        },
      ] as const;
    }),
  );
  return {
    enabled: config.enabled,
    resetsAt: new Date(dayStart.getTime() + 86400000),
    operations: Object.fromEntries(rows),
  };
}
