CREATE TABLE "UsagePayment" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "payerAddress" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsagePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsagePayment_txHash_key" ON "UsagePayment"("txHash");
CREATE UNIQUE INDEX "UsagePayment_userId_idempotencyKey_key" ON "UsagePayment"("userId", "idempotencyKey");
CREATE INDEX "UsagePayment_workspaceId_createdAt_idx" ON "UsagePayment"("workspaceId", "createdAt");
CREATE INDEX "UsagePayment_userId_createdAt_idx" ON "UsagePayment"("userId", "createdAt");
