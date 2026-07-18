import { createHash } from 'node:crypto';

export const passwordPolicy = (password: string) =>
  password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
export const workspaceSlug = (value: string) =>
  /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/.test(value);
export const contentHash = (content: string) =>
  createHash('sha256').update(content, 'utf8').digest('hex');
export function canTransition(
  from: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'DEPRECATED' | 'ARCHIVED',
  to: typeof from,
) {
  const transitions: Record<typeof from, readonly string[]> = {
    DRAFT: ['IN_REVIEW', 'ARCHIVED'],
    IN_REVIEW: ['APPROVED', 'DRAFT', 'ARCHIVED'],
    APPROVED: ['PUBLISHED', 'IN_REVIEW'],
    PUBLISHED: ['DEPRECATED'],
    DEPRECATED: ['ARCHIVED'],
    ARCHIVED: [],
  };
  return transitions[from].includes(to);
}
export const normalizeWalletAddress = (address: string) => {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('VALIDATION_ERROR');
  return address.toLowerCase();
};
const sensitiveKeys =
  /password|secret|token|signature|private.?key|seed|mnemonic|encryption.?key|prompt.?content|plaintext|api.?key|authorization|cookie/i;
export function redactAuditMetadata<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactAuditMetadata(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        sensitiveKeys.test(key) ? '[REDACTED]' : redactAuditMetadata(nested),
      ]),
    ) as T;
  }
  return value;
}

export type InvitationState = 'pending' | 'accepted' | 'rejected' | 'canceled' | 'expired';
export function invitationState(
  status: string,
  expiresAt: Date,
  now = new Date(),
): InvitationState {
  if (status === 'pending' && expiresAt <= now) return 'expired';
  if (status === 'canceled') return 'canceled';
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

export function assertInvitationCanBeUsed(state: InvitationState) {
  if (state === 'pending') return;
  if (state === 'expired') throw new Error('INVITATION_EXPIRED');
  throw new Error('INVITATION_ALREADY_USED');
}

export function assertOwnerProtection(
  members: Array<{ role: string }>,
  targetRole: string,
  targetUserId: string,
  actorUserId: string,
) {
  if (targetRole.toLowerCase() === 'owner') throw new Error('LAST_OWNER_PROTECTED');
  const owners = members.filter((member) => member.role.toLowerCase() === 'owner');
  if (owners.length === 1 && targetUserId === actorUserId) throw new Error('LAST_OWNER_PROTECTED');
}
