ALTER TABLE "Project" ADD COLUMN "regressionPolicy" TEXT;

ALTER TABLE "Prompt"
  ADD COLUMN "regressionPolicy" TEXT,
  ADD COLUMN "regressionSuiteId" TEXT;

CREATE TABLE "RegressionReport" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "promptId" TEXT NOT NULL,
  "suiteId" TEXT NOT NULL,
  "baselineVersionId" TEXT NOT NULL,
  "candidateVersionId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reportJson" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegressionReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegressionReport_workspaceId_promptId_createdAt_idx"
  ON "RegressionReport"("workspaceId", "promptId", "createdAt");
CREATE INDEX "RegressionReport_candidateVersionId_status_idx"
  ON "RegressionReport"("candidateVersionId", "status");

ALTER TABLE "Prompt"
  ADD CONSTRAINT "Prompt_regressionSuiteId_fkey"
  FOREIGN KEY ("regressionSuiteId") REFERENCES "EvaluationSuite"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegressionReport"
  ADD CONSTRAINT "RegressionReport_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RegressionReport_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RegressionReport_promptId_fkey"
  FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RegressionReport_suiteId_fkey"
  FOREIGN KEY ("suiteId") REFERENCES "EvaluationSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RegressionReport_baselineVersionId_fkey"
  FOREIGN KEY ("baselineVersionId") REFERENCES "PromptVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RegressionReport_candidateVersionId_fkey"
  FOREIGN KEY ("candidateVersionId") REFERENCES "PromptVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
