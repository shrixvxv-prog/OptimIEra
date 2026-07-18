# Production route inventory

## Public pages

| Route                                                 | Purpose                             | Runtime/data            | Mobile and state expectations                   |
| ----------------------------------------------------- | ----------------------------------- | ----------------------- | ----------------------------------------------- |
| `/`                                                   | Product landing and entry points    | Static/server rendered  | Responsive hero, clear testnet status           |
| `/product`, `/how-it-works`, `/use-cases`, `/journey` | Product education                   | Static                  | Keyboard-readable cards and calls to action     |
| `/architecture`, `/security`, `/developers`           | Technical trust information         | Static                  | No credentials or private runtime state         |
| `/proofs`                                             | Proof Center and certificate lookup | Server/client lookup    | Empty, invalid, and valid certificate states    |
| `/verify/[certificateId]`                             | Public privacy-safe verification    | PostgreSQL read         | Loading/not-found/verified/degraded states      |
| `/sign-in`, `/sign-up`, password routes               | Better Auth access                  | Node.js/Auth/PostgreSQL | Email and injected-wallet options, clear errors |
| `/invitations/[invitationId]`                         | Invitation decision                 | Auth/PostgreSQL         | Expired, unauthorized, accepted/rejected states |

## Authenticated Studio pages

All `/app/**` pages require a valid session. Data is scoped to the user’s workspace memberships and role checks are enforced on mutations.

| Route family                               | Purpose                                | Runtime/data                 | Primary states                                         |
| ------------------------------------------ | -------------------------------------- | ---------------------------- | ------------------------------------------------------ |
| `/app`                                     | Dashboard                              | PostgreSQL                   | Metrics, recent work, empty state                      |
| `/app/workspaces/**`                       | Workspace, projects, members, audit    | PostgreSQL                   | Role-aware create/edit/deny/empty                      |
| `/app/prompts/**`                          | Prompt registry and immutable versions | PostgreSQL + encryption      | Search, create, history, not-found                     |
| `/app/optimize`                            | Provider selection and optimization    | PostgreSQL; optional 0G/Nous | Safe mode, quota, timeout, success; no silent fallback |
| `/app/optimizations/[id]`                  | Results, candidates, evidence, proof   | PostgreSQL; optional 0G      | Local, pending, failed, verified, revoked              |
| `/app/evaluations/**`                      | Evaluation history/detail routing      | PostgreSQL                   | Empty and linked-result states                         |
| `/app/reviews/**`                          | Review queue and decisions             | PostgreSQL                   | Role-aware pending/approved/rejected                   |
| `/app/certificates/**`                     | Certificate management                 | PostgreSQL                   | Local, storage verified, fully verified, revoked       |
| `/app/team`, `/app/usage`, `/app/settings` | Team, quotas, profile/security/privacy | PostgreSQL/config            | Empty, configured, safe-mode states                    |

## APIs

| Route family                                    | Auth                     | Purpose and safety boundary                         |
| ----------------------------------------------- | ------------------------ | --------------------------------------------------- |
| `/api/health`, `/api/readiness`, `/api/version` | Public                   | Redacted operational status only                    |
| `/api/auth/**`                                  | Better Auth              | Session, account, and SIWE authentication           |
| `/api/providers`                                | Session                  | Safe provider availability; never API keys          |
| `/api/workspaces/**`                            | Session + role           | Projects, members, invitations                      |
| `/api/reviews/**`                               | Session + role           | Review decisions                                    |
| `/api/v1/optimizations/**`                      | Session + workspace role | Optimize, retry, save, evidence, proof, certificate |
| `/api/v1/certificates/**`                       | Session + workspace role | Read, verify, revoke                                |
| `/api/v1/public/certificates/**`                | Public                   | Privacy-safe certificate JSON/download              |

All external-operation routes use the Node.js runtime. Evidence and proof routes allow up to 60 seconds; provider timeouts remain bounded below platform limits.
