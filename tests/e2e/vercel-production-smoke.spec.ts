import { expect, test } from '@playwright/test';

const productionUrl = process.env.PRODUCTION_BASE_URL;
const liveCertificate = 'cert_1343d8825f8905d881361fa39d7e2a1e';

test.describe('Vercel Production smoke', () => {
  test.skip(!productionUrl, 'PRODUCTION_BASE_URL is required for deployed smoke testing.');

  test('completes the safe public workflow without paid 0G operations', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const email = `production-smoke-${suffix}@example.com`;
    const slug = `smoke-${suffix}`.toLowerCase();

    await page.goto(`${productionUrl}/`);
    await expect(
      page.getByRole('heading', { name: 'Prompt intelligence you can verify.' }),
    ).toBeVisible();
    await expect(page.getByText('0G Galileo Testnet')).toBeVisible();
    await page.goto(`${productionUrl}/api/health`);
    await expect(page.locator('body')).toContainText('"status":"ok"');
    await page.goto(`${productionUrl}/api/readiness`);
    await expect(page.locator('body')).toContainText('"status":"ready"');

    await page.goto(`${productionUrl}/sign-up`);
    await page.getByLabel('Name').fill('Production Smoke');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('ProductionSmokePass12!');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.waitForURL(/onboarding/);
    await page.goto(`${productionUrl}/app/workspaces/new`);
    await page.getByLabel('Name').fill('Production smoke workspace');
    await page.getByLabel('Slug').fill(slug);
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await page.waitForURL(/\/app\/workspaces$/);
    await page.goto(`${productionUrl}/app/workspaces/${slug}/projects/new`);
    await page.getByLabel('Name').fill('Production smoke project');
    await page.getByLabel('Slug').fill('production-smoke-project');
    await page.getByRole('button', { name: 'Create project' }).click();
    await page.getByLabel('Title').fill('Production smoke prompt');
    await page
      .getByLabel('Content')
      .fill('Summarize a technical proposal for an executive audience.');
    await page.getByRole('button', { name: 'Create encrypted prompt' }).click();

    await page.goto(`${productionUrl}/app/optimize`);
    await expect(page.getByLabel('Provider')).toHaveValue('RULES_ENGINE');
    await page.getByLabel('Raw prompt').fill('Summarize this technical proposal.');
    await page.getByLabel('Intended task').fill('Produce an accurate executive summary');
    await page.getByLabel('Target audience').fill('Executive stakeholders');
    await page.getByRole('button', { name: 'Run optimization' }).click();
    await page.waitForURL(/\/app\/optimizations\//);
    const optimizationUrl = page.url();
    await expect(page.locator('.candidate').filter({ hasNotText: 'Original' })).toHaveCount(3);
    const recommended = page.locator('.candidate').filter({ hasText: 'recommended' });
    await recommended.getByRole('button', { name: 'Save as new version' }).click();
    await page.waitForURL(/\/versions\//);

    await page.goto(optimizationUrl);
    await page.getByRole('button', { name: 'Create encrypted evidence' }).click();
    await page.waitForURL(/\/app\/optimizations\//);
    await page.getByRole('button', { name: 'Create proof commitment' }).click();
    await page.waitForURL(/\/app\/optimizations\//);
    await page.getByRole('button', { name: 'Issue certificate' }).click();
    await page.waitForURL(/\/app\/certificates\//);
    const publicLink = page.getByRole('link', { name: /\/verify\// });
    const publicHref = await publicLink.getAttribute('href');
    expect(publicHref).toBeTruthy();
    await page.goto(`${productionUrl}${publicHref}`);
    await expect(page.getByText(/LOCAL_VERIFIED|CHAIN_VERIFIED|FULLY_VERIFIED/)).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Summarize this technical proposal.');

    await page.goto(`${productionUrl}/verify/${liveCertificate}`);
    await expect(page.getByRole('heading', { name: 'FULLY_VERIFIED' })).toBeVisible();
    await expect(page.locator('body')).toContainText(
      '0x05ed3344b48d8ed4b1135ce4d7c8c281af38d17bb431c9a24f523d48180d7519',
    );
    await expect(page.locator('body')).toContainText(
      '0x4d57bf123b8647e0eaa856551e69cb6191ae63baabfdfedcb089011218591724',
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${productionUrl}/app`);
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    await page.locator('.profile-menu summary').click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(/\/sign-in/);
    await page.goto(`${productionUrl}/not-a-real-route`);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
