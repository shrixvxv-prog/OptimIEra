import { expect, test } from '@playwright/test';
import { createOptimization } from './optimization-flow';

test('creates and executes a persisted local benchmark', async ({ page }) => {
  const { optimizationId } = await createOptimization(page, 'benchmark-flow');
  await page.goto('/app/benchmarks');
  await page.getByLabel('Name').fill('Browser benchmark suite');
  await page.getByLabel('Description').fill('Created by focused browser coverage');
  await page
    .getByLabel('Cases (JSON)')
    .fill('[{"input":"example","evaluator":"CONTAINS","expected":"example","weight":1}]');
  await page.getByRole('button', { name: 'Create benchmark suite' }).click();
  await page.waitForURL(/\/app\/benchmarks\/.+/);
  await expect(page.getByRole('heading', { name: 'Browser benchmark suite' })).toBeVisible();
  await page.getByLabel('Optimization ID').fill(optimizationId);
  await page.getByRole('button', { name: 'Run against Original and candidates' }).click();
  await page.waitForURL(/\/app\/benchmarks\/.+/);
  await expect(page.getByText('SUCCEEDED').first()).toBeVisible();
  await expect(page.getByText(/Provenance hash:/)).toBeVisible();
  await expect(page.getByText(/Comparison ORIGINAL:/)).toBeVisible();
  await expect(page.getByText(/ORIGINAL:.*PASS/)).toBeVisible();
});
