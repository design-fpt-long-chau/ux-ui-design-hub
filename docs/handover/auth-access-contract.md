# Auth / Access contract

The detailed interface, methods and route/state specification is maintained in [Auth/access UX and adapter contract](auth-access.md). This is the canonical handoff entry point, not a second implementation.

- UI depends on IdentityProvider and optional IdentitySession contracts.
- Local Edition uses neutral `local-user` / `Local User` defaults. Saved identity/history is preserved; Local login is simulation, not production authentication.
- Company mode remains fail-closed until FPT supplies its adapter. The public mode flag is not authorization.
- UX supports Login, Authenticating, allowed/denied access, expired session, friendly errors/retry, logout and safe intended-route return.
- Logout preserves Library records/previews/settings/assets. Role/title is read-only identity metadata, not a client permissions engine.
- FPT owns real SSO/session security, server-side permissions/RBAC/RLS, accounts/admin management and credentials.

See [architecture](architecture.md), [ownership boundary](ownership-boundary.md) and [known issues](known-issues.md). Existing TypeScript contracts remain authoritative; this package changes no interface.
