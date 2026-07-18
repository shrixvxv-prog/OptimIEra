import { headers } from 'next/headers';
import { auth } from './auth';

export const roles = ['OWNER', 'ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER'] as const;
export type Role = (typeof roles)[number];
export const permissions = {
  OWNER: [
    'workspace:manage',
    'members:manage',
    'projects:write',
    'prompts:write',
    'reviews:write',
    'workspace:delete',
  ],
  ADMIN: ['workspace:manage', 'members:manage', 'projects:write', 'prompts:write', 'reviews:write'],
  EDITOR: ['projects:write', 'prompts:write'],
  REVIEWER: ['projects:read', 'prompts:read', 'reviews:write'],
  VIEWER: ['projects:read', 'prompts:read'],
} as const;
export type Permission = (typeof permissions)[Role][number];

export function can(role: Role, permission: Permission) {
  return (permissions[role] as readonly string[]).includes(permission);
}
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('UNAUTHENTICATED');
  return session;
}
export function assertResourceBelongsToWorkspace(resourceWorkspaceId: string, workspaceId: string) {
  if (resourceWorkspaceId !== workspaceId) throw new Error('NOT_FOUND');
}
