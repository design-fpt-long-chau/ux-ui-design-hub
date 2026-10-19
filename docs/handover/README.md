# LC Design Library V1 handover

This package hands over the frontend and Local Edition, not a production service.
Product/UIUX V1 is frozen: no new Product/UI features unless needed for an approved handoff blocker or bug.

## DELIVERED
- Product/UIUX and canonical IA; frontend/core behavior.
- Local repositories, local identity/preferences, browser-local previews.
- Provider-agnostic TypeScript contracts and Local reference adapters.
- Export/Import/Backup ZIP v1 and validation/rollback behavior.
- Acceptance records, automated tests and handover instructions.
- Auth/access frontend states, safe return routing and optional IdentitySession contract; Local Edition can bypass login; explicit logout opens the testable Local login simulation.
- Figma frame-source and accepted-version UX, server-side token isolation, provider-agnostic adapter contracts, real frame verification/PNG export, comparison and immutable local version snapshots.

## FPT OWNS
Production backend/DB/object storage; real SSO/Auth/session; RBAC/RLS; production Figma OAuth/token/webhook/background sync; hosting/domain/secrets; monitoring/security and backup infrastructure. None are enabled by this handover tag.

## Final Handoff Package

- [Sign-off summary](signoff-summary.md): product `1e7cfe9` / `signoff-ready-v1-final`; final documentation tag `handoff-final-v1`.
- [Deployment transfer status](deployment-transfer-status.md): ownership evidence, environment contract and outstanding production actions.
- [Transfer checklist](transfer-checklist.md): receiver-owned transfer steps.
- [Final acceptance checklist](final-acceptance-checklist.md): confirmation fields and external gates.

Receiver signatures remain pending. The package does not certify live Figma quota proof or production infrastructure.

## Read in this order
1. [Product overview](product-overview.md)
2. [Local setup](local-setup.md)
3. [Architecture](architecture.md) and [data model](data-model.md)
4. [Integration](integration.md), [Figma integration](figma-integration.md) and [ownership boundary](ownership-boundary.md)
5. [Backup/restore](backup-restore.md) and [troubleshooting](troubleshooting.md)
6. [Known issues](known-issues.md) and [handover checklist](handover-checklist.md)
7. [Auth/access UX contract](auth-access-contract.md) — FPT authentication remains unimplemented.

Git synchronizes code only. HOME/OFFICE browser records and uploaded images do not move with a clone or pull. Do not reset storage to troubleshoot missing data.

Product freeze evidence is recorded in the [final release record](final-release-freeze.md). The [handover checklist](handover-checklist.md) retains dated historical drills and older tags; current references and external gates are in the [sign-off summary](signoff-summary.md).

Current repository and access methods: [integration contract index](integration-contract.md).

Latest focused audit and coverage limits: [product master re-audit](product-master-re-audit.md).

## Deployment direction — 2026-10-13

FPT will deploy on a company-managed internal Node.js/Next.js server. Vercel is not required. Server/domain and technical owner remain TBD by FPT; TrọngPD3 is the designated recipient, not automatically the technical owner. See the [internal-server runbook](deployment-transfer-status.md#internal-server-runbook). Existing release tags remain immutable; these deployment instructions are a subsequent documentation update on `main`.
