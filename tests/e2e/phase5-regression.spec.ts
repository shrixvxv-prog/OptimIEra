import { expect, test } from '@playwright/test';
import { createPromptVersionForWorkspace, db } from '@optimiera/database';
import { createOptimization } from './optimization-flow';

test('attaches a benchmark suite and renders a persisted regression report', async ({ page }) => {
  process.env.OPTIMIERA_ENCRYPTION_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
  const { optimizationId } = await createOptimization(page, 'regression-flow');
  const job = await db.optimizationJob.findUniqueOrThrow({ where: { id: optimizationId } });
  const promptId = job.promptId!;

  await page.goto('/app/benchmarks');
  await page.getByLabel('Name').fill('Regression browser suite');
  await page
    .getByLabel('Cases (JSON)')
    .fill('[{"input":"example","evaluator":"CONTAINS","expected":"example","weight":1}]');
  await page.getByRole('button', { name: 'Create benchmark suite' }).click();
  await page.waitForURL(/\/app\/benchmarks\/.+/);

  await createPromptVersionForWorkspace({
    workspaceId: job.workspaceId,
    promptId,
    createdById: job.createdById,
    content: 'Write a private summary containing example.',
    changeSummary: 'Regression candidate',
  });

  await page.goto(`/app/prompts/${promptId}`);
  await page.locator('select[name="suiteId"]').selectOption({ label: 'Regression browser suite' });
  await page
    .locator('textarea[name="policy"]')
    .fill('{"minimumSuccessScore":0.5,"severities":{"minimumSuccessScore":"BLOCKING"}}');
  await page.getByRole('button', { name: 'Attach suite and policy' }).click();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (
      (await db.prompt.findUnique({ where: { id: promptId }, select: { regressionSuiteId: true } }))
        ?.regressionSuiteId
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await page.reload();
  await expect(page.getByRole('button', { name: 'Run regression' })).toBeVisible();
  await page.locator('select[name="baselineVersionId"]').selectOption({ index: 0 });
  await page.locator('select[name="candidateVersionId"]').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Run regression' }).click();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await db.regressionReport.findFirst({ where: { promptId } })) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await page.reload();
  await expect(page.getByText('PASS').last()).toBeVisible();
  await expect(page.getByText(/Hash:/)).toBeVisible();
});
