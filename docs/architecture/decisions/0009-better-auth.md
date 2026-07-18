# ADR 0009: Better Auth with organization-backed workspaces

Status: accepted. Better Auth 1.6.x provides email/password sessions, secure account flows, and the organization plugin used as OptimIEra's workspace tenant foundation. The UI says Workspace while the persistence model uses the plugin's Organization/Member/Invitation tables. Verified 2026-07-15 against the [Better Auth introduction](https://better-auth.com/docs/introduction), [Next.js integration](https://better-auth.com/docs/integrations/next), [Prisma adapter](https://better-auth.com/docs/adapters/prisma), and [organization plugin](https://better-auth.com/docs/plugins/organization).

SIWE uses Better Auth's official SIWE integration with injected EIP-1193 wallet providers. Non-injected connectors such as WalletConnect remain out of scope for this increment.
