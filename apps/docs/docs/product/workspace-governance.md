# Workspace governance

OptimIEra workspaces use Better Auth organizations. Invitations are pending until the invited email authenticates and accepts; rejection, revocation, expiry, and reuse are terminal states. Local invitation delivery is a development-safe notice and does not claim external email delivery.

Owners and admins manage eligible members and invitations. Editors, reviewers, and viewers cannot manage membership. The final owner cannot be demoted or removed. Every server mutation rechecks the session, workspace membership, role, target workspace, and ownership invariant.

Prompt versions are immutable. Editors request review, reviewers approve or reject, and approved versions become active only through a validated service. Audit events are workspace-scoped and recursively redact credentials, tokens, signatures, keys, cookies, and prompt content.
