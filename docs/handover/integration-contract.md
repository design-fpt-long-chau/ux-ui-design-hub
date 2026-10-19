# Integration contract index

The authoritative entity and repository method reference is [FPT Integration Contract](../fpt-integration-contract.md). Current TypeScript contracts in `src/lib/repositories/contracts.ts` are the implementation authority.

Read [Auth / Access](auth-access.md) for the IdentityProvider session and FPT SSO entry contract, [adapter integration](integration.md) for composition and verification, and [ownership boundary](ownership-boundary.md) for delivery responsibilities.

Core consumes contracts; the composition root selects Local reference adapters today and FPT adapters later. FPT owns production DB/backend/storage, real SSO/Auth/session, RBAC/RLS, hosting/domain, secrets/security, monitoring/backup infrastructure and admin/member management. No provider stack is mandated.
