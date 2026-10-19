# Ownership transfer checklist

Receiver actions remain pending. The [historical handover checklist](handover-checklist.md) records development evidence, not receiver acceptance.

## Source and release

- [ ] Confirm receiver access to the [source repository](https://github.com/leoriclee1295-web/long-chau-design-library).
- [ ] Agree Git ownership destination: **TBD by FPT**; preserve history and all existing tags.
- [ ] Verify product `1e7cfe9` / `signoff-ready-v1-final` and final docs `handoff-final-v1`; record the full resolved handoff SHA.
- [ ] Clone, install with committed lockfile, run and build using [local setup](local-setup.md).
- [ ] Confirm all [handoff docs](README.md) received.

## Deployment and data

- [ ] Agree FPT internal server/VM, technical owner and domain: **TBD by FPT**. Vercel is not required.
- [ ] Provision internal hosting, connect company repository and verify `main`, release SHA, runtime/build settings, process supervision and HTTPS. Follow [deployment runbook](deployment-transfer-status.md#internal-server-runbook).
- [ ] Provision FPT-owned backend/storage/SSO/RBAC and Figma automation separately. Local adapters are not production infrastructure.
- [ ] Transfer approved Library data using [backup/restore](backup-restore.md), not Git; verify counts, stable IDs, order and assets with disposable QA data first.
- [ ] Verify production deployment and [environment contract](deployment-transfer-status.md).
- [ ] Complete live Figma proof using an editable quota-qualified frame; honor Retry-After and the Starter/low limitation.

## Credentials and confirmation

- [ ] Provision FPT-owned secrets through approved secret management/secure channels. Never record values in Git, docs, tickets, screenshots or public environment variables.
- [ ] Do not transfer personal tokens or `.env.local` through this package.
- [ ] Confirm receiver control, deployment and recovery/backup access before revoking personal access or credentials.
- [ ] Complete [final acceptance checklist](final-acceptance-checklist.md), including external exclusions and owners.
- [ ] Revoke personal ownership/credentials only after explicit receiver confirmation; record completion through the receiving team's secure process.
