import { randomUUID } from 'node:crypto';
import { db } from '@optimiera/database';
import type { Page } from '@playwright/test';

const databaseTarget = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
if (
  process.env.NODE_ENV !== 'test' ||
  !databaseTarget.includes('localhost') ||
  !databaseTarget.includes('optimiera_test')
) {
  throw new Error('E2E helpers are restricted to the local test environment.');
}

export function uniqueEmail(label: string) {
  return `e2e-${label}-${randomUUID()}@example.test`;
}

export function uniqueSlug(label: string) {
  return `e2e-${label}-${randomUUID().slice(0, 8)}`;
}

export async function register(page: Page, label: string, email = uniqueEmail(label)) {
  await page.goto('/sign-up');
  await page.getByLabel('Name').fill(`E2E ${label}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('StrongPassword12');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.waitForURL(/onboarding/);
  return { email, password: 'StrongPassword12' };
}

export async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/\/app$/);
}

export async function invitationForEmail(email: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const invitation = await db.invitation.findFirst({
      where: { email, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { organization: true },
    });
    if (invitation) return invitation;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No pending invitation found for ${email}`);
}

export async function promptForTitle(title: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const prompt = await db.prompt.findFirst({ where: { title } });
    if (prompt) return prompt;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No prompt found for ${title}`);
}

export async function memberForEmail(workspaceId: string, email: string) {
  return db.member.findFirstOrThrow({
    where: { organizationId: workspaceId, user: { email } },
    include: { user: true },
  });
}

export async function auditCount(workspaceId: string, action: string) {
  return db.auditEvent.count({ where: { workspaceId, action } });
}
