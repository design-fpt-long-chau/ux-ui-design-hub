# Deployment transfer status

Updated: 2026-10-13. Deployment direction: FPT-managed internal Node.js/Next.js server; Vercel is not required. Previously checked: 2026-10-12. Source/configuration inspection only; no deployment, ownership or environment changes performed.

## Release and ownership

| Item | Verified value / status |
| --- | --- |
| Source repository current owner | `leoriclee1295-web` — namespace in the configured GitHub remote; organization permissions were not independently verified |
| Repository remote | `https://github.com/leoriclee1295-web/long-chau-design-library.git` |
| Hosting destination | FPT-managed internal server/VM; host, technical owner and domain TBD by FPT |
| Vercel | Not required for this handoff; no project transfer is a prerequisite |
| Production branch | `main` (expected; deployed project setting not independently verified) |
| Final release commit | `1e7cfe950cb21c2a3791b0d80807dbd6d9c88d1c` (`1e7cfe9`) |
| Final release tag | `signoff-ready-v1-final`, resolves to the release commit above |
| Production URL | TBD — not detectable from the inspected repository/configuration |
| Transfer destination | TBD by FPT |

This documentation commit may advance `main` beyond the frozen release. The final release tag remains unchanged.

## Deployment configuration and portability

- `package.json`: Next.js `16.3.4`, React `19.2.8`, pnpm `11.19.0`; use the committed `pnpm-lock.yaml` and `pnpm install --frozen-lockfile`.
- Build: `pnpm build`. Server: `pnpm start` (`next start`). Use the repository root. Local setup documents verified Node `24.20.0`; configure the receiving host's supported runtime explicitly.
- `next.config.ts` has no custom deployment options. No tracked `vercel.json`, Vercel SDK, project/team IDs, deployment workflow or Dockerfile was found. `.vercel` is ignored and `.vercel/project.json` is absent. `public/vercel.svg` is a static scaffold asset, not an account dependency.
- Source/configuration supports the existing standard Next.js server scripts without a Vercel account. Actual internal-server provisioning, network access, domain/TLS and production deployment remain unverified/TBD.
- The application requires a Next.js server for API routes, including Figma verification/PNG export; do not treat it as a static-only export.

## Environment contract

| Variable | Scope and behavior |
| --- | --- |
| `FIGMA_ACCESS_TOKEN` | Optional server-only secret for live Figma verification/preview. Missing token leaves Local/manual mode usable. FPT must provision its own authorized credential and sufficient API quota. Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_LIBRARY_MODE` | Public build-time selection. Unset uses Local Edition; `company` selects the unconfigured, fail-closed identity adapter until FPT implements it. This flag is not authorization. Rebuild after changing it. |
| `NODE_ENV` | Framework-managed environment; development-only Figma diagnostics are excluded from production UI. |

`.env.local` is ignored and untracked; no secret values were read or included here. Targeted tracked-file checks found no personal token/private-key signature, hard-coded personal runtime identity or personal machine path. Local defaults are `local-user` / `Local User`; existing user-saved profiles/history remain browser content, not runtime dependencies.

Local Edition stores Library records/previews per browser origin. Moving repositories or hosting ownership does not transfer that data. Domain changes create a different origin; use approved Export/Import/Backup separately. Company production backend/storage, real SSO/session, RBAC/RLS and Figma OAuth/token lifecycle remain FPT-owned. Hosting the frontend on an internal server alone does not enable those services or shared multi-user data. Live Figma version proof retains the documented Starter/low-quota external limitation.

## Required future actions

1. Move the repository to FPT-designated source control, preserving history and release tags.
2. Provision an FPT-owned internal server/VM with the agreed Node.js runtime, pnpm, service account, network policy and operational owner. No Vercel account/project is required.
3. Connect the company repository/deployment process; confirm root directory, `main`, pinned release SHA, runtime, install/build settings, process supervision and internal domain/HTTPS.
4. Recreate production environment variables using FPT-owned secrets, scoped separately to production and QA/staging. Do not copy personal credentials into the handoff document or Git.
5. Verify production deployment: intended release, routes, environment status without secret disclosure, auth/access enforcement, assets, backup/restore and live Figma quota. Obtain receiver confirmation.
6. Revoke personal ownership/credentials only after the receiver confirms successful deployment and control of all required services.

Status: ready for future ownership transfer; not a claim that production deployment or account transfer has already been verified.

Final documentation package: `handoff-final-v1`; see [sign-off summary](signoff-summary.md) and [receiver acceptance](final-acceptance-checklist.md). Product release references above remain unchanged.

## Internal-server runbook

This is a receiver execution plan, not evidence that an internal deployment has already passed.

1. Confirm repository access, then deploy an approved immutable commit from `main`. Product freeze is `1e7cfe9` / `signoff-ready-v1-final`; `handoff-final-v1` is the original documentation package. Later docs on `main` do not move those tags.
2. Use the verified Node 24.20.0 / pinned pnpm 11.19.0 baseline, or validate the receiving team's approved runtime. Install/build with access to the approved package registry/cache:

   ```sh
   pnpm install --frozen-lockfile
   pnpm build
   pnpm start --hostname 127.0.0.1 --port 3000
   ```

3. The command above assumes a reverse proxy on the same machine. FPT configures the internal domain, HTTPS and proxy to the application port, plus an approved process supervisor for restart/boot, logs and monitoring. Other network/container arrangements need an explicitly approved bind address and access policy. Do not use `pnpm dev` as the production service.
4. Inject FPT-owned server secrets through approved secret management. Do not copy personal `.env.local` or expose token values. Live Figma needs authorized outbound connectivity, credentials and sufficient API quota; manual Local mode does not require a Figma token.
5. Leave Local mode available for receiver evaluation. Company mode fails closed until the production IdentityProvider is implemented. Internal hosting is not a substitute for server-side authorization or shared backend/storage.
6. Verify Home/Screens/Flows/Detail/Add/Edit/Profile, API route handling, backup export/import with disposable data, and the agreed Auth/access integration. Verify assets, stable IDs/order and environment status without printing secrets. Record results in the final acceptance checklist.
7. Preserve the prior approved deployment for rollback. Browser-origin data is separate: changing protocol/domain/port requires user-approved Export/Import, not a storage reset. FPT owns service backups and recovery procedures.
8. Obtain receiver confirmation before revoking personal access/credentials. Vercel availability is not a release or acceptance blocker.
