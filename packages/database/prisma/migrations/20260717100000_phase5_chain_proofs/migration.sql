CREATE TABLE "ChainProof" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "optimizationJobId" TEXT NOT NULL,
  "artifactId" TEXT,
  "proofId" TEXT NOT NULL,
  "contractAddress" TEXT,
  "chainId" INTEGER NOT NULL,
  "network" TEXT NOT NULL,
  "manifestHash" TEXT NOT NULL,
  "storageRoot" TEXT,
  "transactionHash" TEXT,
  "blockNumber" BIGINT,
  "blockHash" TEXT,
  "registrarAddress" TEXT,
  "aggregateScore" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'LOCAL_READY',
  "confirmationCount" INTEGER NOT NULL DEFAULT 0,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "safeErrorCode" TEXT,
  "safeErrorMessage" TEXT,
  "submittedAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChainProof_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChainProof_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChainProof_optimizationJobId_fkey" FOREIGN KEY ("optimizationJobId") REFERENCES "OptimizationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChainProof_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ChainProof_workspaceId_optimizationJobId_key" ON "ChainProof"("workspaceId", "optimizationJobId");
CREATE INDEX "ChainProof_workspaceId_status_idx" ON "ChainProof"("workspaceId", "status");
CREATE INDEX "ChainProof_proofId_idx" ON "ChainProof"("proofId");
