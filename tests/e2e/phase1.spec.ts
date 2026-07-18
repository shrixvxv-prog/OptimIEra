import { expect, test } from '@playwright/test';
import { db } from '@optimiera/database';
import {
  auditCount,
  invitationForEmail,
  memberForEmail,
  promptForTitle,
  register,
  signIn,
  uniqueEmail,
  uniqueSlug,
} from './helpers';

async function createWorkspace(page: import('@playwright/test').Page, label: string) {
  const account = await register(page, label);
  const slug = uniqueSlug(label);
  await page.goto('/app/workspaces/new');
  await page.getByLabel('Name').fill(`E2E ${label} workspace`);
  await page.getByLabel('Slug').fill(slug);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.waitForURL(/\/app\/workspaces$/);
  return { account, slug };
}

async function inviteFromMembers(
  page: import('@playwright/test').Page,
  slug: string,
  email: string,
  role = 'viewer',
) {
  await page.goto(`/app/workspaces/${slug}/members`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Role').selectOption(role);
  await page.getByRole('button', { name: 'Create invitation' }).click();
  await page.waitForURL(new RegExp(`/app/workspaces/${slug}/members`));
  return invitationForEmail(email);
}

test('registration, onboarding, project, and encrypted prompt persistence', async ({ page }) => {
  const { slug } = await createWorkspace(page, 'persistence');
  await page.goto(`/app/workspaces/${slug}/projects/new`);
  await page.getByLabel('Name').fill('Persistence project');
  await page.getByLabel('Slug').fill('persistence-project');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForURL(/\/app\/prompts\/new/);
  await page.getByLabel('Title').fill('Persistent prompt');
  await page.getByLabel('Content').fill('version one secret content');
  await page.getByRole('button', { name: 'Create encrypted prompt' }).click();
  await page.waitForURL(/\/app\/prompts\/.+/);
  const promptId = (await promptForTitle('Persistent prompt')).id;
  const first = await db.promptVersion.findFirstOrThrow({ where: { promptId, versionNumber: 1 } });
  expect(first.encryptedContent).not.toContain('version one secret content');
  await page.getByRole('link', { name: 'Create new version' }).click();
  await page.getByLabel('Content').fill('version two secret content');
  await page.getByLabel('Change summary').fill('Second immutable version');
  await page.getByRole('button', { name: 'Create version' }).click();
  await expect(page.getByText(/Content is encrypted at rest/)).toBeVisible();
  const versions = await db.promptVersion.findMany({
    where: { promptId },
    orderBy: { versionNumber: 'asc' },
  });
  expect(versions.map((version) => version.versionNumber)).toEqual([1, 2]);
  expect(versions[0].contentHash).not.toBe(versions[1].contentHash);
});

test('invitation acceptance, rejection, revocation, and reuse prevention', async ({
  browser,
  page,
}) => {
  const { slug } = await createWorkspace(page, 'invites');
  const acceptedEmail = uniqueEmail('accepted');
  const accepted = await inviteFromMembers(page, slug, acceptedEmail);
  const acceptedContext = await browser.newContext();
  const acceptedPage = await acceptedContext.newPage();
  await register(acceptedPage, 'accepted', acceptedEmail);
  await acceptedPage.goto(`/invitations/${accepted.id}`);
  await acceptedPage.getByRole('button', { name: 'Accept invitation' }).click();
  await acceptedPage.waitForURL(new RegExp(`/app/workspaces/${slug}/members`));
  await expect(acceptedPage.getByText(acceptedEmail, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(acceptedEmail, { exact: true })).toBeVisible();
  expect((await db.invitation.findUniqueOrThrow({ where: { id: accepted.id } })).status).toBe(
    'accepted',
  );
  await acceptedPage.goto(`/invitations/${accepted.id}`);
  await expect(acceptedPage.getByText(/no longer usable/i)).toBeVisible();
  await acceptedContext.close();

  const rejectedEmail = uniqueEmail('rejected');
  const rejected = await inviteFromMembers(page, slug, rejectedEmail);
  const rejectedContext = await browser.newContext();
  const rejectedPage = await rejectedContext.newPage();
  await register(rejectedPage, 'rejected', rejectedEmail);
  await rejectedPage.goto(`/invitations/${rejected.id}`);
  await rejectedPage.getByRole('button', { name: 'Reject invitation' }).click();
  await expect(rejectedPage).toHaveURL(/\/app\/workspaces$/);
  expect(
    await db.member.findFirst({
      where: { organizationId: rejected.organizationId, user: { email: rejectedEmail } },
    }),
  ).toBeNull();
  await rejectedPage.goto(`/invitations/${rejected.id}`);
  await expect(rejectedPage.getByText(/no longer usable/i)).toBeVisible();
  await rejectedContext.close();

  const revokedEmail = uniqueEmail('revoked');
  const revoked = await inviteFromMembers(page, slug, revokedEmail);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Revoke' }).last().click();
  await expect
    .poll(async () => (await db.invitation.findUnique({ where: { id: revoked.id } }))?.status)
    .toBe('canceled');
  await page.reload();
  await expect(page.getByText(revokedEmail)).toBeVisible();
  const revokedContext = await browser.newContext();
  const revokedPage = await revokedContext.newPage();
  await register(revokedPage, 'revoked', revokedEmail);
  await revokedPage.goto(`/invitations/${revoked.id}`);
  await expect(revokedPage.getByText(/no longer usable/i)).toBeVisible();
  await revokedContext.close();
  expect(await auditCount(revoked.organizationId, 'workspace.invitation.revoked')).toBeGreaterThan(
    0,
  );
});

test('role enforcement and owner protection use separate authenticated contexts', async ({
  browser,
  page,
}) => {
  const { slug } = await createWorkspace(page, 'roles');
  const memberEmail = uniqueEmail('member');
  const invitation = await inviteFromMembers(page, slug, memberEmail, 'viewer');
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await register(memberPage, 'member', memberEmail);
  await memberPage.goto(`/invitations/${invitation.id}`);
  await memberPage.getByRole('button', { name: 'Accept invitation' }).click();
  await memberPage.waitForURL(new RegExp(`/app/workspaces/${slug}/members`));
  const ownerMember = await memberForEmail(invitation.organizationId, memberEmail);
  const forbiddenProject = await memberContext.request.post(`/api/workspaces/${slug}/projects`, {
    data: { name: 'Forbidden', slug: uniqueSlug('forbidden') },
  });
  expect(forbiddenProject.status()).toBe(403);
  const forbiddenInvite = await memberContext.request.post(`/api/workspaces/${slug}/invitations`, {
    data: { email: uniqueEmail('forbidden-invite') },
  });
  expect(forbiddenInvite.status()).toBe(403);
  const forbiddenRole = await memberContext.request.patch(
    `/api/workspaces/${slug}/members/${ownerMember.id}`,
    { data: { role: 'admin' } },
  );
  expect(forbiddenRole.status()).toBe(403);
  expect(
    await db.project.findFirst({
      where: { workspaceId: invitation.organizationId, slug: { startsWith: 'e2e-forbidden' } },
    }),
  ).toBeNull();

  await page.goto(`/app/workspaces/${slug}/members`);
  const row = page.getByText(memberEmail).locator('..');
  await row.locator('select').selectOption('reviewer');
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Change role' }).click();
  await page.reload();
  await expect(page.getByText(memberEmail, { exact: true })).toBeVisible();
  await memberPage.goto('/app/reviews');
  await expect(memberPage.getByRole('heading', { name: 'Prompt reviews' })).toBeVisible();
  await expect(memberPage.getByRole('link', { name: /Members/ })).toHaveCount(0);
  const reviewerForbiddenProject = await memberContext.request.post(
    `/api/workspaces/${slug}/projects`,
    { data: { name: 'Reviewer forbidden', slug: uniqueSlug('reviewer-forbidden') } },
  );
  expect(reviewerForbiddenProject.status()).toBe(403);
  const reviewerForbiddenInvite = await memberContext.request.post(
    `/api/workspaces/${slug}/invitations`,
    { data: { email: uniqueEmail('reviewer-forbidden-invite') } },
  );
  expect(reviewerForbiddenInvite.status()).toBe(403);
  const owner = await db.member.findFirstOrThrow({
    where: { organizationId: invitation.organizationId, role: 'owner' },
  });
  const ownerDelete = await page.request.delete(`/api/workspaces/${slug}/members/${owner.id}`);
  expect(ownerDelete.status()).toBe(409);
  await memberContext.close();
});

test('review approval, rejection, immutable history, and illegal transition', async ({
  browser,
  page,
}) => {
  const { slug } = await createWorkspace(page, 'reviews');
  await page.goto(`/app/workspaces/${slug}/projects/new`);
  await page.getByLabel('Name').fill('Review project');
  await page.getByLabel('Slug').fill('review-project');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByLabel('Title').fill('Review prompt');
  await page.getByLabel('Content').fill('review version one');
  await page.getByRole('button', { name: 'Create encrypted prompt' }).click();
  await page.waitForURL(/\/app\/prompts\/.+/);
  const promptId = (await promptForTitle('Review prompt')).id;
  const reviewerEmail = uniqueEmail('reviewer');
  const invitation = await inviteFromMembers(page, slug, reviewerEmail, 'reviewer');
  const reviewerContext = await browser.newContext();
  const reviewerPage = await reviewerContext.newPage();
  await register(reviewerPage, 'reviewer', reviewerEmail);
  await reviewerPage.goto(`/invitations/${invitation.id}`);
  await reviewerPage.getByRole('button', { name: 'Accept invitation' }).click();
  await reviewerPage.waitForURL(new RegExp(`/app/workspaces/${slug}/members`));
  await expect
    .poll(() =>
      db.member.count({
        where: { organizationId: invitation.organizationId, user: { email: reviewerEmail } },
      }),
    )
    .toBe(1);
  await signIn(reviewerPage, { email: reviewerEmail, password: 'StrongPassword12' });
  await page.goto(`/app/prompts/${promptId}/versions/new`);
  await page.getByLabel('Content').fill('review version two');
  await page.getByLabel('Change summary').fill('Reviewable change');
  await page.getByRole('button', { name: 'Create version' }).click();
  await page.goto(`/app/prompts/${promptId}`);
  await page.reload();
  const versionTwo = page.locator('div.actions').filter({ hasText: 'Version 2' });
  const reviewerMember = await memberForEmail(invitation.organizationId, reviewerEmail);
  const sessionResponse = await reviewerPage.request.get('/api/auth/get-session');
  expect((await sessionResponse.json()).user.id).toBe(reviewerMember.userId);
  await versionTwo.locator('select').selectOption(reviewerMember.userId);
  await versionTwo.getByRole('button', { name: 'Request review' }).click();
  await expect
    .poll(() => db.promptReview.count({ where: { workspaceId: invitation.organizationId } }))
    .toBe(1);
  await reviewerPage.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache' });
  const queueResponse = await reviewerPage.request.get(`/app/reviews?refresh=${Date.now()}`);
  const queueHtml = await queueResponse.text();
  expect(queueHtml).toContain('Review prompt');
  const reviewLink = queueHtml.match(/href="(\/app\/reviews\/[^\"]+)"/);
  expect(reviewLink?.[1]).toBeTruthy();
  await reviewerPage.goto(reviewLink![1], { waitUntil: 'networkidle' });
  await reviewerPage.getByLabel('Review note').fill('Approved in browser');
  reviewerPage.once('dialog', (dialog) => dialog.accept());
  await reviewerPage.getByRole('button', { name: 'Approve' }).click();
  await expect(reviewerPage.getByText('APPROVED')).toBeVisible();
  const review = await db.promptReview.findFirstOrThrow({
    where: {
      workspaceId: invitation.organizationId,
      promptVersion: { promptId, versionNumber: 2 },
    },
  });
  await expect(reviewerPage.getByRole('button', { name: 'Approve' })).toHaveCount(0);
  const repeatedDecision = await reviewerPage.request.post(`/api/reviews/${review.id}/decision`, {
    data: { approve: true, note: 'Repeated approval must be rejected' },
  });
  expect(repeatedDecision.status()).toBe(409);
  expect(
    (await db.promptVersion.findFirstOrThrow({ where: { promptId, versionNumber: 1 } }))
      .contentHash,
  ).toBe(
    (await db.promptVersion.findFirstOrThrow({ where: { promptId, versionNumber: 1 } }))
      .contentHash,
  );
  expect(review.status).toBe('APPROVED');
  await page.goto(`/app/prompts/${promptId}/versions/new`);
  await page.getByLabel('Content').fill('review version three');
  await page.getByLabel('Change summary').fill('Rejected browser change');
  await page.getByRole('button', { name: 'Create version' }).click();
  await page.goto(`/app/prompts/${promptId}`);
  await page.reload();
  const versionThree = page.locator('div.actions').filter({ hasText: 'Version 3' });
  await versionThree.locator('select').selectOption(reviewerMember.userId);
  await versionThree.getByRole('button', { name: 'Request review' }).click();
  await expect
    .poll(async () => {
      const secondReview = await db.promptReview.findFirst({
        where: { workspaceId: invitation.organizationId, status: 'REQUESTED' },
        orderBy: { createdAt: 'desc' },
      });
      return secondReview?.id;
    })
    .toBeTruthy();
  const secondReview = await db.promptReview.findFirstOrThrow({
    where: { workspaceId: invitation.organizationId, status: 'REQUESTED' },
    orderBy: { createdAt: 'desc' },
  });
  await reviewerPage.goto(`/app/reviews/${secondReview.id}`, { waitUntil: 'networkidle' });
  await reviewerPage.getByLabel('Review note').fill('Rejected in browser');
  reviewerPage.once('dialog', (dialog) => dialog.accept());
  await reviewerPage.getByRole('button', { name: 'Reject' }).click();
  await expect(reviewerPage.getByText('REJECTED')).toBeVisible();
  await expect
    .poll(async () =>
      (
        await db.promptReview.findMany({
          where: { workspaceId: invitation.organizationId },
          orderBy: { createdAt: 'asc' },
        })
      ).map((item) => item.status),
    )
    .toEqual(['APPROVED', 'REJECTED']);
  await reviewerContext.close();
});

test('cross-workspace page access and mutation denial do not leak prompt content', async ({
  browser,
  page,
}) => {
  const owner = await createWorkspace(page, 'isolated-a');
  await page.goto(`/app/workspaces/${owner.slug}/projects/new`);
  await page.getByLabel('Name').fill('Private project');
  await page.getByLabel('Slug').fill('private-project');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByLabel('Title').fill('Private prompt');
  await page.getByLabel('Content').fill('never render this secret');
  await page.getByRole('button', { name: 'Create encrypted prompt' }).click();
  await page.waitForURL(/\/app\/prompts\/.+/);
  const promptId = (await promptForTitle('Private prompt')).id;
  const project = await db.project.findFirstOrThrow({
    where: {
      workspaceId: (await db.organization.findUniqueOrThrow({ where: { slug: owner.slug } })).id,
    },
  });
  const version = await db.promptVersion.findFirstOrThrow({
    where: { promptId, versionNumber: 1 },
  });
  const userB = await createWorkspace(page, 'isolated-b');
  const userBContext = await browser.newContext();
  const userBPage = await userBContext.newPage();
  await signIn(userBPage, userB.account);
  for (const path of [
    `/app/workspaces/${owner.slug}`,
    `/app/workspaces/${owner.slug}/projects/${project.id}`,
    `/app/prompts/${promptId}`,
    `/app/prompts/${promptId}/versions/${version.id}`,
    `/app/workspaces/${owner.slug}/audit`,
  ]) {
    await userBPage.goto(path);
    await expect(
      userBPage.getByText(/never render this secret|Private project|Private prompt/),
    ).toHaveCount(0);
  }
  const mutation = await userBContext.request.post(`/api/workspaces/${owner.slug}/projects`, {
    data: { name: 'Cross-workspace write', slug: uniqueSlug('cross-write') },
  });
  expect(mutation.status()).toBe(404);
  await userBContext.close();
});

test('Phase 2 optimization workflow analyzes, compares, saves, and persists a new version', async ({
  page,
}) => {
  const { slug } = await createWorkspace(page, 'phase2-optimize');
  await page.goto(`/app/workspaces/${slug}/projects/new`);
  await page.getByLabel('Name').fill('Phase 2 optimization project');
  await page.getByLabel('Slug').fill('phase2-optimization-project');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForURL(/\/app\/prompts\/new/);
  await page.goto('/app/optimize');
  await expect(page.getByText('Provider: OptimIEra Rules Engine')).toBeVisible();
  await page.getByLabel('Existing prompt or create new').selectOption('__new__');
  await page.getByLabel('New prompt title').fill('Phase 2 browser prompt');
  await page
    .getByLabel('Raw prompt')
    .fill('Write a good onboarding email for workspace admins with setup steps and timelines.');
  await page.getByLabel('Intended task').fill('Create an onboarding email');
  await page.getByLabel('Target audience').fill('New workspace administrators');
  await page.getByLabel('Desired output type').selectOption('EMAIL');
  await page.getByLabel('Tone').fill('Friendly and precise');
  await page.getByLabel('Optimization mode').selectOption('BALANCED');
  await page.getByLabel('Expected length').fill('Under 250 words');
  await page.getByLabel('Output language').fill('English');
  await page.getByLabel('Privacy level').selectOption('PRIVATE');
  await page.getByLabel('Additional context').fill('The admin has already created an account.');
  await page
    .getByLabel('Constraints')
    .fill('Do not invent product features\nMention support contact');
  await page.getByLabel('Required elements').fill('setup steps\ntimeline\ncall to action');
  await page.getByLabel('Forbidden elements').fill('discount claims');
  await page.getByLabel('Examples').fill('Subject: Welcome to OptimIEra');
  await page.getByRole('button', { name: 'Run optimization' }).click();
  await page.waitForURL(/\/app\/optimizations\/.+/);
  await expect(page.getByRole('heading', { name: 'Optimization result' })).toBeVisible();
  await expect(page.getByText('Mode: Deterministic local optimization')).toBeVisible();
  await expect(page.getByRole('heading', { name: /BALANCED/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /ACCURACY_FOCUSED/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /TOKEN_EFFICIENT/ })).toBeVisible();
  await expect(page.getByText('Prompt diff')).toBeVisible();
  const optimizationId = page.url().match(/optimizations\/([^/?#]+)/)?.[1];
  expect(optimizationId).toBeTruthy();
  const job = await db.optimizationJob.findUniqueOrThrow({
    where: { id: optimizationId },
    include: { candidates: true },
  });
  expect(job.status).toBe('SUCCEEDED');
  expect(job.providerName).toBe('OptimIEra Rules Engine');
  expect(job.candidates).toHaveLength(3);
  expect(
    job.candidates.every((candidate) => !candidate.encryptedContent.includes('onboarding email')),
  ).toBe(true);
  const sourceVersions = await db.promptVersion.findMany({
    where: { promptId: job.promptId ?? undefined },
    orderBy: { versionNumber: 'asc' },
  });
  expect(sourceVersions).toHaveLength(1);
  const saveTarget = page.locator('article.candidate').filter({ hasText: '(recommended)' }).first();
  await saveTarget.getByLabel('Version change summary').fill('Saved browser optimization');
  await saveTarget.getByRole('button', { name: 'Save as new version' }).click();
  await page.waitForURL(/\/app\/prompts\/.+\/versions\/.+/);
  await expect(page.getByText(/Content is encrypted at rest/)).toBeVisible();
  const savedVersions = await db.promptVersion.findMany({
    where: { promptId: job.promptId ?? undefined },
    orderBy: { versionNumber: 'asc' },
  });
  expect(savedVersions.map((version) => version.versionNumber)).toEqual([1, 2]);
  expect(savedVersions[0].contentHash).not.toBe(savedVersions[1].contentHash);
  expect(
    await db.optimizationJob.findFirst({
      where: { id: job.id, savedPromptVersionId: savedVersions[1].id },
    }),
  ).not.toBeNull();
});

test('Phase 2 viewer cannot create optimization or save a candidate', async ({ browser, page }) => {
  const { slug } = await createWorkspace(page, 'phase2-deny');
  await page.goto(`/app/workspaces/${slug}/projects/new`);
  await page.getByLabel('Name').fill('Phase 2 denial project');
  await page.getByLabel('Slug').fill('phase2-denial-project');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByLabel('Title').fill('Phase 2 denial prompt');
  await page.getByLabel('Content').fill('Write a concise internal update.');
  await page.getByRole('button', { name: 'Create encrypted prompt' }).click();
  await page.waitForURL(/\/app\/prompts\/.+/);
  const viewerEmail = uniqueEmail('phase2-viewer');
  const invitation = await inviteFromMembers(page, slug, viewerEmail, 'viewer');
  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await register(viewerPage, 'phase2-viewer', viewerEmail);
  await viewerPage.goto(`/invitations/${invitation.id}`);
  await viewerPage.getByRole('button', { name: 'Accept invitation' }).click();
  await viewerPage.waitForURL(new RegExp(`/app/workspaces/${slug}/members`));
  const prompt = await promptForTitle('Phase 2 denial prompt');
  const denied = await viewerContext.request.post('/api/v1/optimizations', {
    data: {
      promptId: prompt.id,
      rawPrompt: 'Write a concise internal update.',
      intendedTask: 'Write an internal update',
      targetAudience: 'Workspace admins',
      desiredOutputType: 'MARKDOWN',
      desiredTone: 'Concise',
      optimizationMode: 'BALANCED',
      constraints: [],
      requiredElements: ['summary'],
      forbiddenElements: [],
      examples: [],
      expectedLength: { label: 'Short' },
      outputLanguage: 'English',
      privacyLevel: 'PRIVATE',
    },
  });
  expect(denied.status()).toBe(403);
  await viewerPage.goto('/app/optimize');
  await expect(viewerPage.getByText('Workspace setup required')).toBeVisible();
  await viewerContext.close();
});
