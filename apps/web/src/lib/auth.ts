import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization, siwe } from 'better-auth/plugins';
import { db } from '@optimiera/database';
import { randomBytes } from 'node:crypto';
import { verifyMessage } from 'viem';

const localNotice = (kind: string, recipient: string, url: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.info(
      `[OptimIEra local mail] ${kind} for ${recipient}: ${url.replace(/([?&](token|callbackURL)=)[^&]+/gi, '$1[REDACTED]')}`,
    );
  }
};

const configuredAuthSecret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  !configuredAuthSecret
) {
  throw new Error('BETTER_AUTH_SECRET_MISSING');
}

const trustedOrigins = [
  process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

export const auth = betterAuth({
  secret: configuredAuthSecret ?? 'local-only-change-me',
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => localNotice('password reset', user.email, url),
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) =>
      localNotice('email verification', user.email, url),
    sendOnSignUp: false,
  },
  rateLimit: { enabled: process.env.BETTER_AUTH_E2E !== 'true' },
  trustedOrigins,
  plugins: [
    siwe({
      domain: new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').host,
      anonymous: true,
      getNonce: async () => randomBytes(16).toString('hex'),
      verifyMessage: async ({ message, signature, address }) =>
        verifyMessage({
          address: address as `0x${string}`,
          message,
          signature: signature as `0x${string}`,
        }),
    }),
    organization({
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async ({ invitation, organization }) =>
        localNotice(
          'workspace invitation',
          `${invitation.email} (${organization.name})`,
          `${process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'}/invitations/${invitation.id}`,
        ),
    }),
  ],
});
