CREATE TABLE "LiveOperationUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "dayStart" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "LiveOperationUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiveOperationUsage_userId_operation_idempotencyKey_key"
  ON "LiveOperationUsage"("userId", "operation", "idempotencyKey");
CREATE INDEX "LiveOperationUsage_operation_dayStart_status_idx"
  ON "LiveOperationUsage"("operation", "dayStart", "status");
CREATE INDEX "LiveOperationUsage_userId_operation_dayStart_status_idx"
  ON "LiveOperationUsage"("userId", "operation", "dayStart", "status");
CREATE INDEX "LiveOperationUsage_requestId_idx" ON "LiveOperationUsage"("requestId");
