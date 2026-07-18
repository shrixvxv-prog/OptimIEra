import { expect, test } from '@playwright/test';
import { db } from '@optimiera/database';
import { invitationForEmail, register, uniqueEmail } from './helpers';
import { createOptimization, createWorkspace } from './optimization-flow';

test('Phase 4 local encrypted evidence persists and remains unconfigured', async ({ page }) => {
  test.skip(
    process.env.OG_CHAIN_TEST_ADAPTER === 'true',
    'Runs in the live-unconfigured E2E environment',
  );
  const { secret, optimizationId } = await createOptimization(page, 'evidence-local');
  await expect(page.getByText('0G Storage — UNCONFIGURED')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload to 0G Storage' })).toBeDisabled();
  await expect(page.getByText('Retry is available after a failed upload.')).toBeVisible();
  await page.getByRole('button', { name: 'Create encrypted evidence' }).click();
  await page.waitForURL(new RegExp(`/app/optimizations/${optimizationId}`));
  await expect(page.getByText('Status:').locator('..').getByText('LOCAL_CREATED')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create proof commitment' })).toBeVisible();
  await page.getByRole('button', { name: 'Create proof commitment' }).click();
  await expect(page.getByText('Status:').locator('..').getByText('LOCAL_READY')).toBeVisible();
  await expect(page.getByText(/Proof ID:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Register on 0G Chain' })).toBeDisabled();
  await expect(page.getByText('0G Chain — Unconfigured')).toBeVisible();
  await expect(page.getByText(/Content hash:/)).toBeVisible();
  await expect(page.getByText(/Byte size:/)).toBeVisible();
  const response = await page.request.get(`/api/v1/optimizations/${optimizationId}/evidence`);
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).not.toContain(secret);
  const artifact = await db.artifact.findFirstOrThrow({
    where: { optimizationJobId: optimizationId },
  });
  expect(artifact.status).toBe('LOCAL_CREATED');
  expect(artifact.encryptedManifest).not.toContain(secret);
  await page.reload();
  await expect(page.getByText(/Content hash:/)).toBeVisible();
  await expect(page.getByText('Status:').locator('..').getByText('LOCAL_CREATED')).toBeVisible();
});

test('Phase 4 evidence authorization denies viewers and other workspaces', async ({
  browser,
  page,
}) => {
  const { slug, optimizationId } = await createOptimization(page, 'evidence-auth');
  await page.getByRole('button', { name: 'Create encrypted evidence' }).click();
  await page.waitForURL(new RegExp(`/app/optimizations/${optimizationId}`));
  const viewerEmail = uniqueEmail('evidence-viewer');
  await page.goto(`/app/workspaces/${slug}/members`);
  await page.getByLabel('Email').fill(viewerEmail);
  await page.getByLabel('Role').selectOption('viewer');
  await page.getByRole('button', { name: 'Create invitation' }).click();
  const invitation = await invitationForEmail(viewerEmail);
  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await register(viewerPage, 'evidence-viewer', viewerEmail);
  await viewerPage.goto(`/invitations/${invitation.id}`);
  await viewerPage.getByRole('button', { name: 'Accept invitation' }).click();
  expect(
    (await viewerContext.request.post(`/api/v1/optimizations/${optimizationId}/evidence`)).status(),
  ).toBe(403);
  await viewerContext.close();
  const other = await createWorkspace(page, 'evidence-other');
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto('/sign-in');
  await otherPage.getByLabel('Email').fill(other.account.email);
  await otherPage.getByLabel('Password').fill(other.account.password);
  await otherPage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await otherPage.waitForURL(/\/app$/);
  expect(
    (await otherContext.request.get(`/api/v1/optimizations/${optimizationId}/evidence`)).status(),
  ).toBe(403);
  expect(
    (await otherContext.request.post(`/api/v1/optimizations/${optimizationId}/evidence`)).status(),
  ).toBe(403);
  await otherContext.close();
});
