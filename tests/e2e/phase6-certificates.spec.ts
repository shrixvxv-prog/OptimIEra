import { expect, test } from '@playwright/test';
import { db } from '@optimiera/database';
import { createOptimization } from './optimization-flow';

test.describe('Phase 6 public certificates', () => {
  test.skip(
    process.env.OG_CHAIN_TEST_ADAPTER !== 'true',
    'Requires the explicit test-only chain adapter',
  );

  async function prepareCertificate(page: import('@playwright/test').Page, label: string) {
    const { optimizationId, secret } = await createOptimization(page, label);
    await page.getByRole('button', { name: 'Save as new version' }).first().click();
    await page.waitForURL(/\/app\/prompts\/.*\/versions\/.*$/);
    await page.goto(`/app/optimizations/${optimizationId}`);
    await page.getByRole('button', { name: 'Create encrypted evidence' }).click();
    await expect(page.getByText('LOCAL_CREATED', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Create proof commitment' }).click();
    await expect(page.getByText('LOCAL_READY', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Register on 0G Chain' }).click();
    await page.waitForURL(new RegExp(`/app/optimizations/${optimizationId}`));
    await expect(page.getByText('VERIFIED', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Issue certificate' }).click();
    await page.waitForURL(/\/app\/certificates\/.*$/);
    return {
      optimizationId,
      secret,
      certificateId: page.url().match(/certificates\/([^/?#]+)/)![1],
    };
  }

  test('issues idempotently, verifies publicly, downloads safely, and revokes', async ({
    browser,
    page,
  }) => {
    const { optimizationId, secret, certificateId } = await prepareCertificate(
      page,
      'certificate-public',
    );
    const certificate = await db.certificate.findUniqueOrThrow({ where: { id: certificateId } });
    const duplicate = await page.request.post(
      `/api/v1/optimizations/${optimizationId}/certificate`,
    );
    expect(duplicate.status()).toBe(201);
    const duplicateBody = await duplicate.json();
    expect(duplicateBody.certificate.id).toBe(certificateId);
    const publicPage = await browser.newPage();
    await publicPage.goto(`/verify/${certificate.publicSlug}`);
    await expect(publicPage.getByText('TEST_VERIFIED', { exact: true })).toBeVisible();
    await expect(publicPage.getByText(secret)).toHaveCount(0);
    const download = await publicPage.request.get(
      `/api/v1/public/certificates/${certificate.publicSlug}/download`,
    );
    expect(download.status()).toBe(200);
    const body = await download.text();
    expect(body).not.toContain(secret);
    expect(body).not.toContain('encryptedOriginalPrompt');
    await publicPage.close();
    await page.goto(`/app/optimizations/${optimizationId}`);
    await page.getByLabel('Revocation reason').fill('Chain proof propagation test');
    await page.getByRole('button', { name: 'Revoke proof' }).click();
    await page.waitForURL(new RegExp(`/app/optimizations/${optimizationId}`));
    const revokedPage = await browser.newPage();
    await revokedPage.goto(`/verify/${certificate.publicSlug}`);
    await expect(revokedPage.getByText('REVOKED', { exact: true })).toBeVisible();
    await revokedPage.close();
    await page.goto(`/app/certificates/${certificateId}`);
    await page.getByLabel('Reason').fill('Certificate test revocation');
    await page.getByRole('button', { name: 'Revoke certificate' }).click();
    await expect(page.getByText('REVOKED', { exact: true })).toBeVisible();
  });

  test('tampered evidence produces FAILED verification', async ({ page }) => {
    const { certificateId } = await prepareCertificate(page, 'certificate-tamper');
    const certificate = await db.certificate.findUniqueOrThrow({ where: { id: certificateId } });
    await db.artifact.update({
      where: { id: certificate.artifactId! },
      data: { contentHash: 'tampered-content-hash' },
    });
    await page.goto(`/verify/${certificate.publicSlug}`);
    await expect(page.getByText('FAILED', { exact: true })).toBeVisible();
    await expect(page.getByText(/manifest-hash: FAIL/)).toBeVisible();
  });
});
