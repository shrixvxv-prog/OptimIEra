ALTER TABLE "Certificate"
  ADD COLUMN "optimizationJobId" TEXT,
  ADD COLUMN "sourcePromptVersionId" TEXT,
  ADD COLUMN "selectedPromptVersionId" TEXT,
  ADD COLUMN "candidateId" TEXT,
  ADD COLUMN "chainProofId" TEXT,
  ADD COLUMN "certificateId" TEXT,
  ADD COLUMN "publicSlug" TEXT,
  ADD COLUMN "schemaVersion" TEXT NOT NULL DEFAULT 'OptimizationCertificateV1',
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "certificateContentHash" TEXT,
  ADD COLUMN "verificationLevel" TEXT NOT NULL DEFAULT 'LOCAL_VERIFIED',
  ADD COLUMN "aggregateScore" INTEGER,
  ADD COLUMN "confidence" INTEGER,
  ADD COLUMN "issuerRefHash" TEXT,
  ADD COLUMN "providerType" TEXT,
  ADD COLUMN "providerName" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "analyzerVersion" TEXT,
  ADD COLUMN "scoringVersion" TEXT,
  ADD COLUMN "originalPromptHash" TEXT,
  ADD COLUMN "optimizedPromptHash" TEXT,
  ADD COLUMN "evaluationHash" TEXT,
  ADD COLUMN "manifestHash" TEXT,
  ADD COLUMN "storageRoot" TEXT,
  ADD COLUMN "storageTransactionHash" TEXT,
  ADD COLUMN "chainProofPublicId" TEXT,
  ADD COLUMN "chainTransactionHash" TEXT,
  ADD COLUMN "contractAddress" TEXT,
  ADD COLUMN "chainId" INTEGER,
  ADD COLUMN "network" TEXT,
  ADD COLUMN "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "safeFailureCode" TEXT,
  ADD COLUMN "safeFailureMessage" TEXT;

ALTER TABLE "Certificate"
  ALTER COLUMN "optimizationJobId" SET NOT NULL,
  ALTER COLUMN "sourcePromptVersionId" SET NOT NULL,
  ALTER COLUMN "selectedPromptVersionId" SET NOT NULL,
  ALTER COLUMN "candidateId" SET NOT NULL,
  ALTER COLUMN "certificateId" SET NOT NULL,
  ALTER COLUMN "publicSlug" SET NOT NULL,
  ALTER COLUMN "contentHash" SET NOT NULL,
  ALTER COLUMN "certificateContentHash" SET NOT NULL,
  ALTER COLUMN "aggregateScore" SET NOT NULL,
  ALTER COLUMN "confidence" SET NOT NULL,
  ALTER COLUMN "issuerRefHash" SET NOT NULL,
  ALTER COLUMN "providerType" SET NOT NULL,
  ALTER COLUMN "providerName" SET NOT NULL,
  ALTER COLUMN "originalPromptHash" SET NOT NULL,
  ALTER COLUMN "optimizedPromptHash" SET NOT NULL,
  ALTER COLUMN "evaluationHash" SET NOT NULL,
  ALTER COLUMN "manifestHash" SET NOT NULL;

CREATE UNIQUE INDEX "Certificate_certificateId_key" ON "Certificate"("certificateId");
CREATE UNIQUE INDEX "Certificate_publicSlug_key" ON "Certificate"("publicSlug");
CREATE INDEX "Certificate_optimizationJobId_idx" ON "Certificate"("optimizationJobId");
CREATE INDEX "Certificate_workspaceId_selectedPromptVersionId_idx" ON "Certificate"("workspaceId", "selectedPromptVersionId");

ALTER TABLE "Certificate"
  ADD CONSTRAINT "Certificate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Certificate_optimizationJobId_fkey" FOREIGN KEY ("optimizationJobId") REFERENCES "OptimizationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Certificate_sourcePromptVersionId_fkey" FOREIGN KEY ("sourcePromptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Certificate_selectedPromptVersionId_fkey" FOREIGN KEY ("selectedPromptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Certificate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Certificate_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Certificate_chainProofId_fkey" FOREIGN KEY ("chainProofId") REFERENCES "ChainProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;
