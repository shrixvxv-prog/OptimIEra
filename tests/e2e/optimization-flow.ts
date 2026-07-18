import type { Page } from '@playwright/test';
import { invitationForEmail, register, uniqueSlug } from './helpers';

export async function createWorkspace(page: Page, label: string) {
  const account = await register(page, label);
  const slug = uniqueSlug(label);
  await page.goto('/app/workspaces/new');
  await page.getByLabel('Name').fill(`E2E ${label} workspace`);
  await page.getByLabel('Slug').fill(slug);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.waitForURL(/\/app\/workspaces$/);
  return { account, slug };
}

export async function createOptimization(page: Page, label: string) {
  const { slug } = await createWorkspace(page, label);
  await page.goto(`/app/workspaces/${slug}/projects/new`);
  await page.getByLabel('Name').fill(`${label} project`);
  await page.getByLabel('Slug').fill(uniqueSlug(`${label}-project`));
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForURL(/\/app\/prompts\/new/);
  const secret = `phase4-secret-${Date.now()}-${label}`;
  await page.goto('/app/optimize');
  await page.getByLabel('Existing prompt or create new').selectOption('__new__');
  await page.getByLabel('New prompt title').fill(`${label} prompt`);
  await page.getByLabel('Raw prompt').fill(`Write a private summary containing ${secret}.`);
  await page.getByLabel('Intended task').fill('Create a private summary');
  await page.getByLabel('Target audience').fill('Workspace administrators');
  await page.getByLabel('Desired output type').selectOption('MARKDOWN');
  await page.getByLabel('Tone').fill('Clear');
  await page.getByLabel('Optimization mode').selectOption('BALANCED');
  await page.getByLabel('Expected length').fill('Short');
  await page.getByLabel('Output language').fill('English');
  await page.getByLabel('Privacy level').selectOption('PRIVATE');
  await page.getByRole('button', { name: 'Run optimization' }).click();
  await page.waitForURL(/\/app\/optimizations\/.+/);
  return { slug, secret, optimizationId: page.url().match(/optimizations\/([^/?#]+)/)![1] };
}

export { invitationForEmail };
