ALTER TABLE "OptimizationJob"
  ADD COLUMN "sourcePromptVersionId" TEXT,
  ADD COLUMN "requestedById" TEXT,
  ADD COLUMN "mode" TEXT,
  ADD COLUMN "providerType" TEXT,
  ADD COLUMN "providerName" TEXT,
  ADD COLUMN "analyzerVersion" TEXT,
  ADD COLUMN "scoringVersion" TEXT,
  ADD COLUMN "requestMetadata" TEXT,
  ADD COLUMN "encryptedRequestData" TEXT,
  ADD COLUMN "analysisData" TEXT,
  ADD COLUMN "originalScore" INTEGER,
  ADD COLUMN "recommendedScore" INTEGER,
  ADD COLUMN "recommendedCandidateId" TEXT,
  ADD COLUMN "savedCandidateId" TEXT,
  ADD COLUMN "savedPromptVersionId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "failureCode" TEXT,
  ADD COLUMN "safeFailureMessage" TEXT;

UPDATE "OptimizationJob"
SET
  "requestedById" = "createdById",
  "mode" = 'BALANCED',
  "providerType" = 'RULES_ENGINE',
  "providerName" = 'OptimIEra Rules Engine'
WHERE "requestedById" IS NULL;

ALTER TABLE "OptimizationJob"
  ALTER COLUMN "requestedById" SET NOT NULL,
  ALTER COLUMN "mode" SET NOT NULL,
  ALTER COLUMN "providerType" SET NOT NULL,
  ALTER COLUMN "providerName" SET NOT NULL;

ALTER TABLE "Candidate"
  ADD COLUMN "candidateType" TEXT,
  ADD COLUMN "encryptedContent" TEXT,
  ADD COLUMN "changeSummary" TEXT,
  ADD COLUMN "scoreData" TEXT,
  ADD COLUMN "providerType" TEXT,
  ADD COLUMN "providerName" TEXT,
  ADD COLUMN "tokenEstimate" INTEGER,
  ADD COLUMN "rank" INTEGER,
  ADD COLUMN "recommended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "selected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "savedPromptVersionId" TEXT,
  ADD COLUMN "generationVersion" TEXT;

UPDATE "Candidate"
SET
  "candidateType" = 'BALANCED',
  "encryptedContent" = '',
  "changeSummary" = '',
  "scoreData" = '{}',
  "providerType" = 'RULES_ENGINE',
  "providerName" = 'OptimIEra Rules Engine',
  "tokenEstimate" = 0,
  "rank" = 1,
  "generationVersion" = 'rules-generation-v1'
WHERE "candidateType" IS NULL;

ALTER TABLE "Candidate"
  ALTER COLUMN "candidateType" SET NOT NULL,
  ALTER COLUMN "encryptedContent" SET NOT NULL,
  ALTER COLUMN "changeSummary" SET NOT NULL,
  ALTER COLUMN "scoreData" SET NOT NULL,
  ALTER COLUMN "providerType" SET NOT NULL,
  ALTER COLUMN "providerName" SET NOT NULL,
  ALTER COLUMN "tokenEstimate" SET NOT NULL,
  ALTER COLUMN "rank" SET NOT NULL,
  ALTER COLUMN "generationVersion" SET NOT NULL;

ALTER TABLE "Candidate" DROP COLUMN IF EXISTS "status";

ALTER TABLE "EvaluationRun"
  ADD COLUMN "optimizationJobId" TEXT,
  ADD COLUMN "evaluationVersion" TEXT,
  ADD COLUMN "scoringDimensions" TEXT,
  ADD COLUMN "originalScore" INTEGER,
  ADD COLUMN "winnerCandidateId" TEXT,
  ADD COLUMN "winnerLabel" TEXT,
  ADD COLUMN "confidence" INTEGER,
  ADD COLUMN "warnings" TEXT,
  ADD COLUMN "recommendationRationale" TEXT,
  ADD COLUMN "executionMetadata" TEXT,
  ALTER COLUMN "suiteId" DROP NOT NULL;

ALTER TABLE "EvaluationResult"
  ADD COLUMN "candidateId" TEXT,
  ADD COLUMN "label" TEXT,
  ADD COLUMN "weightedTotal" INTEGER,
  ADD COLUMN "improvementVsOriginal" INTEGER,
  ADD COLUMN "scoreData" TEXT,
  ALTER COLUMN "testCaseId" DROP NOT NULL;

CREATE INDEX "OptimizationJob_promptId_idx" ON "OptimizationJob"("promptId");
CREATE UNIQUE INDEX "OptimizationJob_workspaceId_idempotencyKey_key" ON "OptimizationJob"("workspaceId", "idempotencyKey");
CREATE INDEX "Candidate_optimizationJobId_idx" ON "Candidate"("optimizationJobId");
CREATE INDEX "EvaluationRun_optimizationJobId_idx" ON "EvaluationRun"("optimizationJobId");

ALTER TABLE "Candidate"
  ADD CONSTRAINT "Candidate_optimizationJobId_fkey"
  FOREIGN KEY ("optimizationJobId") REFERENCES "OptimizationJob"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvaluationRun"
  ADD CONSTRAINT "EvaluationRun_optimizationJobId_fkey"
  FOREIGN KEY ("optimizationJobId") REFERENCES "OptimizationJob"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
