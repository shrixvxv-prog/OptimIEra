# ADR 0010: Tenant-aware repository boundaries

Status: accepted. Domain queries must carry workspace context and use compound workspace/resource keys or membership checks. Client visibility is never authorization. The initial authorization matrix is centralized in `apps/web/src/lib/authorization.ts`; server mutations must call session and membership guards before repository operations.
