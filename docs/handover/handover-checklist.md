# Handover checklist

Current package references: [sign-off summary](signoff-summary.md) and [receiver acceptance](final-acceptance-checklist.md). Dated test counts and drills below are historical evidence; the final product freeze records 141 passing tests.

Date: 2026-10-08. Release candidate: current GitHub `main` after the Figma plug-and-play/version-sync delivery.

## LC delivery gate
- [x] Product/UIUX acceptance and canonical IA documented.
- [x] Frontend/core, Local adapters, repository contracts and portability format supplied.
- [x] Complete handover document set linked from README, including Figma integration and ownership boundaries.
- [x] Fresh checkout install/run and complete disposable authoring/restore drill.
- [x] Export/import counts, IDs, Flow order and asset bytes verified.
- [x] QA fixtures cleaned through safe app operations.
- [x] Console, full suite, ESLint, TypeScript and build pass.
- Release operation: push the validated handoff commit, create `handoff-ready-v1`, then verify remote tag/HEAD and clean main. The task's final Git report is authoritative for this gate.

## Fresh-checkout drill
Clone from GitHub into an isolated checkout; install with frozen lockfile; start on an unused QA origin. Create one disposable Product/Group/Flow and two Screens, upload test preview, edit and reorder. Export via UI; restore into a separate clean origin without resetting storage. Compare IDs/order/counts/assets and open restored previews. Delete only the drill records through confirmations and verify unrelated seed inventory remains.

This tests a fresh checkout/install on the OFFICE machine, with an existing pnpm package cache; it is not a separate physical machine/OS certification. QA source: localhost:3011. Clean target: localhost:3012. No localhost:3000 or HOME data is used.

Result: PASS (2026-09-29). Node 24.20.0, pnpm 11.19.0; frozen installation of 354 packages without upgrades. Actual browser creation, upload, publish, edit, reorder, export, restore and cleanup completed.

- Export/restore: 5 products, 30 groups, 25 flows, 66 screens, 1 asset, 3 annotations. Products, groups, flows, screens, note types and component tags matched exactly after re-export; asset bytes matched.
- QA order after editing: `QA Handoff Second Edited`, then `QA Handoff First`. Stable Screen IDs survived edit, reorder and restore. Restored PNG rendered at its original 240 × 480 dimensions.
- Cleanup on both origins: 4 products, 29 groups, 24 flows, 64 screens, 0 assets, 3 annotations. Only the disposable Product/Group/Flow/two Screens were deleted through confirmation UI. Export checks found unique IDs, resolved Flow references and no active drill records. Local deletion markers remain intentionally; storage was not reset.
- Full suite 93/93, ESLint, TypeScript and production builds passed. Final standalone development and production restore browser consoles had no errors.
- A nested QA checkout under another repository's node_modules developed a generated CSS parsing error. A standalone temporary GitHub clone with the same locked install ran correctly, without source/config changes. Use a standalone clone as documented; this runner limitation is not a product-data defect.

No product behavior changed for this handover. Production readiness remains conditional on the FPT gate below.

## FPT production gate — pending FPT implementation/sign-off
- [x] LC Auth/Access UX contract complete: Local bypass; Company Login/loading/allowed/denied/expired/error/logout and safe return paths. Mock browser journeys, Light/Dark/System and 1440/1280/1024 checked; 99 tests, ESLint, TS and build pass. See [auth/access](auth-access.md). This does not complete any FPT infrastructure gate below.
- [ ] Named integration/operations/security owners.
- [ ] Company adapters and contract tests.
- [ ] Staging legacy data and asset lifecycle verification.
- [ ] Auth/SSO, RBAC/RLS and server-side permission tests.
- [ ] Multi-device/concurrent update and recovery tests.
- [ ] Hosting/domain/secrets, monitoring/billing, backups/security sign-off.
- [ ] Production rollout and rollback approval.


## Final refresh 2026-09-29

Fresh GitHub clone of `0dd5694` into a disposable directory, frozen-lockfile installation (354 packages), production build and two isolated QA origins (`3021` → `3022`) completed on OFFICE hardware. This verifies a clean checkout/install, not certification on a separate physical computer.

- [x] Created disposable Product → Group → Flow → two Screens through the browser.
- [x] Uploaded a synthetic 240×480 PNG, entered metadata and published.
- [x] Edited the second Screen without changing its ID; reordered it before the first.
- [x] Exported, previewed and restored into the clean target; created a backup there.
- [x] Compared exported/restored entities exactly, including stable IDs and Flow order; asset bytes matched.
- [x] Verified restored preview renders at its original dimensions and references resolve without duplicates.
- [x] Removed only disposable QA Screens, Flow, Group and Product through confirmed UI actions on both origins.
- [x] Cleanup exports returned to 4 products / 29 groups / 24 flows / 64 screens / 0 assets / 3 annotations. Normal deletion markers remain; storage was not reset.
- [x] Both browser consoles contained no errors. Existing localhost:3000 Library data was untouched.

The drill found a premature redirect during identity checking. The access gate now waits for checking/authenticating to finish before deciding the destination. Patched production retest passed: Local Home loads, logout reaches Login, authenticating disables inputs, mock SSO returns to Home, and console is clean. ESLint, TypeScript, all 102 tests and production build pass. The release commit/tag is recorded with the handoff delivery.

The original `handoff-ready-v1` tag is immutable; this refresh uses a unique dated variant. Production enablement remains pending every FPT-owned integration gate above; Local acceptance does not certify production authentication or security.

## Final handoff refresh 2026-10-08

Scope adds the completed Figma source/version UX and adapter contracts without changing frozen Product/UIUX V1 or IA V1. The fresh-clone drill result, release commit and tag verification are recorded here after execution.

- [x] Fresh GitHub clone and frozen-lockfile install (354 packages, no upgrades).
- [x] Dev server and core route smoke check with clean console.
- [x] Disposable Product → Group → two sibling Flows → Screen creation and preview upload.
- [x] Screen edit and sibling Flow reorder with stable IDs/order.
- [x] Export, clean-origin import and integrity verification.
- [x] Drill-only cleanup without resetting browser storage.
- [x] Full tests, ESLint, TypeScript and production build.
- [x] Final handoff commit pushed, unique release tag published, local HEAD equals `origin/main`, clean tree.

Drill result: PASS through restore. A standalone clone ran on `localhost:3031`; a second standalone clone provided the clean import origin on `localhost:3032`. Existing `localhost:3000` and its browser data were not used.

- Created `QA Handoff 20261008` / `QA Drill Group` with sibling Flows `QA Drill Flow A` and `QA Drill Flow B`, then moved Flow B ahead of Flow A. The shared Add Screen Flow picker reflected the same order.
- Uploaded a quota-safe 480×320 JPEG after the 1.5 MB sample correctly triggered the quota guard without a partial save. Published and edited `QA Handoff Screen` while preserving stable ID `product-15f6ac9c-8b1c-4f91-8f11-858c820ac5f8.group-5307c5e4-fe5a-4963-85d3-4af0c1afb660.qa-handoff-screen`.
- Exported 5 products / 30 groups / 26 flows / 65 screens / 1 asset / 3 annotations. Clean restore reported 126 new, 0 identical and 0 conflicts; the restored Tree retained Flow B → Flow A order, the edited description, stable Screen ID and preview asset.
- Removed only the named drill Screen, sibling Flows, Group and Product through confirmed application UI on both `localhost:3031` and `localhost:3032`. Both origins returned to 4 products / 24 flows / 64 screens with no QA record and clean consoles; `localhost:3000` was not opened or modified.
- The drill found a Web-only Detail fallback that labeled the screen as Mobile when the URL omitted `platform=web`. Platform availability is now resolved through the shared helper before both journey and non-journey detail rendering; focused regression coverage was added.
- Final suite: 117/117 tests, ESLint, TypeScript and production build pass.

The remote `handoff-ready-v1` tag already exists at the original V1 handoff commit and remains immutable. This final refresh is published under the unique follow-up tag `handoff-ready-v1-2026-10-08-2`; no tag was moved or force-updated.


## Sign-off readiness recheck — 2026-10-12

**Ready for frontend/Local Edition handoff sign-off, with explicit external production gates.** This readiness record does not certify a completed live Figma V1-to-V2 proof or production security/infrastructure.

- [x] Product/UIUX and IA acceptance retained; no new feature or architecture changes.
- [x] Neutral Local identity/default seed attribution; saved profiles and historical records preserved. No personal account required.
- [x] Exact canonical Figma URL validation/new-tab links, real PNG adapter contract, pending-candidate safety and version snapshot regressions pass.
- [x] Auth/access, Local persistence, upload, versioning, ordering and portability regression checks pass: **134/134 tests**.
- [x] ESLint, TypeScript and production build pass on this recheck.
- [x] Existing focused browser verification from the immediately preceding cleanup run covers Home/Screens/Flows/Tree/Detail/Full Flow/Add/Edit/Profile/Login; clean runtime console. No broad re-audit or new Figma API call in this recheck.
- [x] Setup, architecture, data model, integration, Auth/access, Figma, backup/restore, known issues and ownership documents present.
- [x] Tracked-file audit found no personal account/machine-path dependency, committed environment file, credential pattern, runtime logs, exported ZIPs or visualization artifacts. Synthetic test fixtures and historical QA reports remain intentional validation sources, not production data.
- [ ] External live Figma same-frame proof: Starter/low quota blocker remains as documented in [Figma integration](figma-integration.md). Requires editable frame and sufficient quota; respect Retry-After.
- [ ] FPT production backend/DB/storage, real SSO/session/RBAC/RLS, OAuth/token lifecycle, webhook/background sync, hosting/domain/secrets, monitoring/security/backup infrastructure.

The `signoff-ready-v1` tag (or a unique suffix if already present) identifies source readiness with these external gates still open. It must not be described as live USP completion or production enablement.
