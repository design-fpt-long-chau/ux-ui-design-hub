# Ownership boundary

| DELIVERED by LC Library | FPT OWNS / not delivered as production infrastructure |
| --- | --- |
| Product/UIUX V1 and IA V1 | Production backend/API/database and tenancy |
| Frontend/core and shared selectors | Production asset storage/lifecycle |
| Local Edition/reference adapters | Auth/SSO/session management |
| Auth/access UX, routes/states and IdentitySession contract | SSO provider, user directory, session/token handling, account lifecycle, admin/member management and security policy |
| Repository and portability contracts | RBAC/RLS and server-side enforcement |
| Export/Import/manual backup | Backup infrastructure, retention, recovery operations |
| Figma source/version UX and adapter contracts | Production Figma OAuth/token lifecycle, webhook/background sync and provider operations |
| QA/acceptance records and tests | Hosting/domain/TLS, environments and deployment |
| Integration documentation | Secrets provisioning/rotation |
| Stable-ID/compatibility requirements | Monitoring/alerts, billing, incident response, security/compliance |

FPT owns production backend/DB/storage, real SSO/Auth/session, RBAC/RLS, production Figma OAuth/token/webhook/background sync, hosting/domain/secrets, monitoring/security and backup infrastructure. FPT must appoint integration, operations and security owners before production enablement. No owner names or approvals are fabricated here. A handoff-ready source tag does not mean FPT production services or security approval are complete.

Joint review is required for contract/tenancy/concurrency decisions and any handoff-blocking product bug. Product feature expansion is outside frozen V1.

## Deployment direction — 2026-10-13

FPT will deploy on a company-managed internal Node.js/Next.js server. Vercel is not required. Server/domain and technical owner remain TBD by FPT; TrọngPD3 is the designated recipient, not automatically the technical owner. See the [internal-server runbook](deployment-transfer-status.md#internal-server-runbook). Existing release tags remain immutable; these deployment instructions are a subsequent documentation update on `main`.
