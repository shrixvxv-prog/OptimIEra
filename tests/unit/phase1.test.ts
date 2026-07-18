import { describe, expect, it } from 'vitest';
import {
  canTransition,
  contentHash,
  assertInvitationCanBeUsed,
  assertOwnerProtection,
  invitationState,
  normalizeWalletAddress,
  passwordPolicy,
  redactAuditMetadata,
  workspaceSlug,
} from '../../packages/database/src/domain';
import { can } from '../../apps/web/src/lib/authorization';

describe('Phase 1 domain rules', () => {
  it('enforces a strong password policy', () => {
    expect(passwordPolicy('Short')).toBe(false);
    expect(passwordPolicy('ValidPassword12')).toBe(true);
  });
  it('validates workspace slugs', () => {
    expect(workspaceSlug('my-workspace')).toBe(true);
    expect(workspaceSlug('Bad Slug')).toBe(false);
  });
  it('keeps content hashes stable', () => {
    expect(contentHash('prompt')).toBe(contentHash('prompt'));
    expect(contentHash('prompt')).not.toBe(contentHash('other'));
  });
  it('allows only legal lifecycle transitions', () => {
    expect(canTransition('DRAFT', 'IN_REVIEW')).toBe(true);
    expect(canTransition('PUBLISHED', 'DRAFT')).toBe(false);
  });
  it('normalizes valid wallet addresses and rejects malformed input', () => {
    expect(normalizeWalletAddress('0x000000000000000000000000000000000000dEaD')).toBe(
      '0x000000000000000000000000000000000000dead',
    );
    expect(() => normalizeWalletAddress('nope')).toThrow();
  });
  it('enforces the role matrix', () => {
    expect(can('OWNER', 'workspace:delete')).toBe(true);
    expect(can('ADMIN', 'workspace:delete')).toBe(false);
    expect(can('EDITOR', 'members:manage')).toBe(false);
    expect(can('REVIEWER', 'reviews:write')).toBe(true);
    expect(can('VIEWER', 'prompts:write' as never)).toBe(false);
  });
  it('redacts sensitive audit metadata', () => {
    expect(
      redactAuditMetadata({ action: 'review', token: 'secret', promptContent: 'private' }),
    ).toEqual({
      action: 'review',
      token: '[REDACTED]',
      promptContent: '[REDACTED]',
    });
  });
  it('redacts nested objects and arrays recursively', () => {
    expect(redactAuditMetadata({ nested: { password: 'x' }, values: [{ token: 'y' }] })).toEqual({
      nested: { password: '[REDACTED]' },
      values: [{ token: '[REDACTED]' }],
    });
  });
  it('redacts all credential and prompt-content key variants', () => {
    const result = redactAuditMetadata({
      currentPassword: 'x',
      accessToken: 'x',
      invitationToken: 'x',
      signature: 'x',
      encryptionKey: 'x',
      apiKey: 'x',
      cookie: 'x',
    });
    expect(Object.values(result)).toEqual(Array(7).fill('[REDACTED]'));
  });
  it('recognizes pending invitations', () => {
    expect(invitationState('pending', new Date(Date.now() + 1000))).toBe('pending');
  });
  it('recognizes expired invitations', () => {
    expect(invitationState('pending', new Date(Date.now() - 1000))).toBe('expired');
  });
  it('blocks reuse of completed invitations', () => {
    expect(() => assertInvitationCanBeUsed('accepted')).toThrow('INVITATION_ALREADY_USED');
    expect(() => assertInvitationCanBeUsed('rejected')).toThrow('INVITATION_ALREADY_USED');
    expect(() => assertInvitationCanBeUsed('canceled')).toThrow('INVITATION_ALREADY_USED');
  });
  it('blocks accepting expired invitations', () => {
    expect(() => assertInvitationCanBeUsed('expired')).toThrow('INVITATION_EXPIRED');
  });
  it('protects the owner from role changes and removal', () => {
    expect(() => assertOwnerProtection([{ role: 'owner' }], 'owner', 'owner-1', 'admin-1')).toThrow(
      'LAST_OWNER_PROTECTED',
    );
  });
  it('allows eligible non-owner member management', () => {
    expect(() =>
      assertOwnerProtection(
        [{ role: 'owner' }, { role: 'viewer' }],
        'viewer',
        'viewer-1',
        'owner-1',
      ),
    ).not.toThrow();
  });
  it('rejects illegal review transitions in both directions', () => {
    expect(canTransition('APPROVED', 'DRAFT')).toBe(false);
    expect(canTransition('ARCHIVED', 'PUBLISHED')).toBe(false);
  });
  it('allows approval and publication lifecycle transitions', () => {
    expect(canTransition('IN_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'PUBLISHED')).toBe(true);
  });
});
