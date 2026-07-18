-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PromptVisibility" AS ENUM ('PRIVATE', 'WORKSPACE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PromptLifecycleStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PromptVersionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OptimizationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EvaluationRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('DRAFT', 'PENDING', 'STORED', 'FAILED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('DRAFT', 'STORAGE_PENDING', 'CHAIN_PENDING', 'VERIFIED', 'REVOKED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "purpose" TEXT,
    "visibility" "PromptVisibility" NOT NULL DEFAULT 'PRIVATE',
    "lifecycleStatus" "PromptLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "activeVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "encryptedContent" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "encryptionStatus" TEXT NOT NULL,
    "parentVersionId" TEXT,
    "changeSummary" TEXT,
    "lifecycleStatus" "PromptVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptReview" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "promptVersionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "promptId" TEXT,
    "status" "OptimizationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "optimizationJobId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationSuite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationSuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedBehavior" TEXT NOT NULL,
    "assertionConfig" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "status" "EvaluationRunStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'DRAFT',
    "kind" TEXT NOT NULL,
    "storageReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'DRAFT',
    "artifactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "safeMetadata" TEXT,
    "requestId" TEXT,
    "ipHash" TEXT,
    "userAgentSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "normalizedAddress" TEXT NOT NULL,
    "displayAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "promptStorageMode" TEXT NOT NULL DEFAULT 'PLAINTEXT_LOCAL_ONLY',

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_userId_key" ON "Member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Invitation_email_status_idx" ON "Invitation"("email", "status");

-- CreateIndex
CREATE INDEX "Project_workspaceId_status_idx" ON "Project"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Project_workspaceId_slug_key" ON "Project"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_activeVersionId_key" ON "Prompt"("activeVersionId");

-- CreateIndex
CREATE INDEX "Prompt_workspaceId_projectId_idx" ON "Prompt"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "PromptVersion_workspaceId_promptId_idx" ON "PromptVersion"("workspaceId", "promptId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_promptId_versionNumber_key" ON "PromptVersion"("promptId", "versionNumber");

-- CreateIndex
CREATE INDEX "PromptReview_workspaceId_promptVersionId_idx" ON "PromptReview"("workspaceId", "promptVersionId");

-- CreateIndex
CREATE INDEX "OptimizationJob_workspaceId_status_idx" ON "OptimizationJob"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Candidate_workspaceId_idx" ON "Candidate"("workspaceId");

-- CreateIndex
CREATE INDEX "EvaluationSuite_workspaceId_idx" ON "EvaluationSuite"("workspaceId");

-- CreateIndex
CREATE INDEX "EvaluationRun_workspaceId_status_idx" ON "EvaluationRun"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Artifact_workspaceId_status_idx" ON "Artifact"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Certificate_workspaceId_status_idx" ON "Certificate"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_workspaceId_status_idx" ON "ApiKey"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "UsageRecord_workspaceId_createdAt_idx" ON "UsageRecord"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_workspaceId_createdAt_idx" ON "AuditEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletIdentity_normalizedAddress_key" ON "WalletIdentity"("normalizedAddress");

-- CreateIndex
CREATE INDEX "WalletIdentity_userId_idx" ON "WalletIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_workspaceId_key" ON "WorkspaceSettings"("workspaceId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptReview" ADD CONSTRAINT "PromptReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptReview" ADD CONSTRAINT "PromptReview_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptReview" ADD CONSTRAINT "PromptReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "EvaluationSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "EvaluationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletIdentity" ADD CONSTRAINT "WalletIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
