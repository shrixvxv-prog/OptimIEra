import { expect, test } from '@playwright/test';
import { db } from '@optimiera/database';
import { createOptimization } from './optimization-flow';
import { invitationForEmail, register, uniqueEmail } from './helpers';

test.describe('Phase 5 test-chain adapter', () => {
  test.skip(
    process.env.OG_CHAIN_TEST_ADAPTER !== 'true',
    'Requires the explicit test-only chain adapter',
  );

  test('Phase 5 test-chain adapter registers, verifies, persists, deduplicates, and revokes a proof', async ({
    page,
  }) => {
    const { optimizationId } = await createOptimization(page, 'chain-proof');
    await page.getByRole('button', { name: 'Create encrypted evidence' }).click();
    await expect(page.getByText('LOCAL_CREATED', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Create proof commitment' }).click();
    await expect(page.getByText('Status:').locator('..').getByText('LOCAL_READY')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register on 0G Chain' })).toBeEnabled();
    await page.getByRole('button', { name: 'Register on 0G Chain' }).click();
    await page.waitForURL(new RegExp(`/app/optimizations/${optimizationId}`));
    await expect(page.getByText('VERIFIED', { exact: true })).toBeVisible();
    await expect(page.getByText('Test chain adapter — Verified')).toBeVisible();
    await expect(page.getByText(/Proof ID:/)).toBeVisible();
    await expect(page.getByText(/Manifest hash:/)).toBeVisible();
    await expect(page.getByText(/Aggregate score:/)).toBeVisible();
    await expect(page.getByText(/Transaction:/)).toBeVisible();
    await expect(page.getByText(/Block:/)).toBeVisible();
    await expect(page.getByText(/Contract:/)).toBeVisible();
    await expect(page.getByText(/Registrar:/)).toBeVisible();
    await expect(page.getByText(/Confirmations:/)).toBeVisible();
    const proofBefore = await db.chainProof.findFirstOrThrow({
      where: { optimizationJobId: optimizationId },
    });
    await page.reload();
    const proofAfter = await db.chainProof.findFirstOrThrow({
      where: { optimizationJobId: optimizationId },
    });
    expect(proofAfter.transactionHash).toBe(proofBefore.transactionHash);
    await expect(page.getByText('VERIFIED', { exact: true })).toBeVisible();
    await page.getByLabel('Revocation reason').fill('Test adapter revocation');
    await page.getByRole('button', { name: 'Revoke proof' }).click();
    await expect(page.getByText('REVOKED', { exact: true })).toBeVisible();
    await expect(page.getByText('Live verified')).toHaveCount(0);
  });

  test('Phase 5 viewer cannot register or revoke a proof', async ({ browser, page }) => {
    const { slug, optimizationId } = await createOptimization(page, 'chain-auth');
    await page.getByRole('button', { name: 'Create encrypted evidence' }).click();
    await page.waitForURL(new RegExp(`/app/optimizations/${optimizationId}`));
    await page.getByRole('button', { name: 'Create proof commitment' }).click();
    const viewerEmail = uniqueEmail('chain-viewer');
    await page.goto(`/app/workspaces/${slug}/members`);
    await page.getByLabel('Email').fill(viewerEmail);
    await page.getByLabel('Role').selectOption('viewer');
    await page.getByRole('button', { name: 'Create invitation' }).click();
    const invitation = await invitationForEmail(viewerEmail);
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await register(viewerPage, 'chain-viewer', viewerEmail);
    await viewerPage.goto(`/invitations/${invitation.id}`);
    await viewerPage.getByRole('button', { name: 'Accept invitation' }).click();
    expect(
      (
        await viewerContext.request.post(`/api/v1/optimizations/${optimizationId}/proof`, {
          data: { register: true },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await viewerContext.request.post(`/api/v1/optimizations/${optimizationId}/proof/revoke`, {
          data: { reason: 'nope' },
        })
      ).status(),
    ).toBe(403);
    await viewerContext.close();
  });
});
