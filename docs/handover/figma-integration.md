# Figma integration

## Delivered Local/UX contract

Add Screen supports an explicit source pre-step: Link Figma Frame or Upload manually. A Figma URL must identify an exact node. The adapter parses `fileKey`/`nodeId`, verifies that node through the Figma Nodes API, requests the exact PNG through the Images API, and displays the real rendered frame in its native aspect ratio. The candidate does not replace an existing source or preview until `Use this frame` is selected.

The provider-neutral `FigmaIntegrationAdapter` exposes `parseFrameUrl()`, `resolveFrame()`, `getPreview()` and `checkForUpdate()`. UI and domain repositories do not call Figma provider APIs directly. Local server routes read only server-side `FIGMA_ACCESS_TOKEN`; the value is never returned or logged, and `.env.local` remains gitignored.

When configuration is missing, LC starts normally and manual upload remains available. The Figma path reports `Figma connection is not configured`. Other supported states are invalid link, no access, frame not found, rate limited, API unavailable and preview unavailable.

## Version sync semantics

- `Current` is the latest LC-accepted durable snapshot.
- `Figma Latest` is the most recent successfully resolved linked frame.
- A differing fingerprint produces one pending update; repeated provider edits replace that candidate rather than creating versions.
- Compare is side-by-side: LC Current versus Figma Latest. There is no pixel-diff engine.
- `Tạo phiên bản mới` uses the already detected durable candidate without another Figma request. The repository rejects changed source identities, deleted Screens and already-synced fingerprints, archives the previous snapshot and writes one new Current version through the coordinated local transaction. A failed later check preserves the pending candidate with a secondary warning; Retry only checks for a newer candidate.
- Canonical Screen ID, Flow references and Flow order never change. Archived versions are selectable/read-only; missing archives fall back to Current with a warning.
- Manual-upload Screens keep version/history compatibility and perform no Figma check until a source is linked.

Failure during provider check or snapshot persistence leaves Current untouched. Local rollback covers normal storage exceptions; browser-process interruption is not database-grade atomicity.

## Local setup

1. Create `.env.local` beside `package.json`.
2. Add `FIGMA_ACCESS_TOKEN=<token>`.
3. Restart `pnpm dev`.
4. Paste a Figma design/file URL containing `node-id`.

Use a token that can read the target file and request rendered images. Do not commit the file, expose the value through `NEXT_PUBLIC_*`, browser logs or screenshots. The safe `/api/figma/status` response reports only `FIGMA INTEGRATION: CONFIGURED` or `NOT CONFIGURED`.

## FPT-owned production work

FPT owns production OAuth/token issuance, storage and rotation; webhook/background sync; provider retry/queue policy; production asset storage/backend/security; authorization and tenant isolation; monitoring and incident response. The Local token path is a development/reference adapter, not the production credential architecture.

## Live USP sign-off gate — 2026-10-12

Status: **EXTERNAL-BLOCKED by Figma Starter/low quota; live USP proof is not complete.**

Automated version-flow and Figma regression checks pass: all 25 targeted tests passed in the finalization run, alongside ESLint, TypeScript and production build. No product or data defect was confirmed. These checks do not replace the outstanding live proof, which requires an editable Figma frame with sufficient API quota.

Read-only OFFICE inspection of QA Screen `pharmacy.product-search.qa-figma-sync-proof-61` showed `v1.1 Current` and `v1.0 Archived`. This is not sufficient evidence of a newly witnessed end-to-end same-frame edit, detection, compare, version creation and refresh cycle. Do not mark that live journey accepted based only on existing history or automated tests.

The retained Figma response diagnostics report `X-Figma-Plan-Tier: starter` and `X-Figma-Rate-Limit-Type: low`. At inspection, the Retry-After-derived countdown had **192,827 seconds remaining** (about 53h 34m). This is a remaining countdown, not the original raw header value. The failed endpoint was `GET /v1/files/xBFehnqMAVcQvPsdKj6byp/nodes?ids=1364%3A40855&depth=1`; the check stopped before image export. The original raw Retry-After and Upgrade-Link were not independently inspected in this sign-off run. No retry, frame edit, version creation or Library data mutation was performed.

### Required FPT setup and completion evidence

- Supply an editable test frame in an approved workspace with sufficient REST API quota; confirm the token owner's seat and the target file's workspace plan. A paid account alone does not establish the target file's applicable quota. See [Figma rate-limit documentation](https://developers.figma.com/docs/rest-api/rate-limits/).
- Provision credentials only through server-side secret management. Never place credentials in the browser, repository, logs or exported Library packages.
- Honor Retry-After and retain backoff, request coalescing and caching. Do not rotate tokens or repeatedly retry to bypass limits. Production monitoring should capture safe endpoint/status/plan/type/cooldown diagnostics, not credentials.
- After quota recovery or an approved alternate frame is supplied, use one disposable proof Screen. Capture the baseline, modify the same exact fileKey/nodeId, detect and compare the candidate, create the next version, view the immutable archived snapshot, return to Current, and refresh to verify history and unchanged canonical ID.
- Record the live evidence before marking USP complete or creating a final sign-off-ready tag. That blocked result did not authorize a completion tag. A subsequent sign-off-readiness tag may record frontend/Local readiness only if it explicitly retains this external live-proof gate.

Current client diagnostics and cache are transient in-memory state; they are not durable across browser reloads or shared across users. FPT owns cross-client quota coordination and production retry/queue infrastructure.

## Manual preview with an optional design source

Screen Information offers an explicit Attach Figma source action for manual uploads. The adapter validates/resolves the exact node, then stores its fileKey, nodeId and URL without fetching or applying a preview. Unconfirmed/invalid text stays local to the optional field and does not block publishing the manual screenshot. Change/remove affects only the design relationship; preview, notes and archived history remain intact.

`sourceType: upload` describes the Current preview; an attached `figmaSource` independently enables Open in Figma and future update checks. Attachment does not claim that the manual screenshot was synchronized from Figma: the accepted fingerprint stays empty until a Figma candidate is explicitly accepted. The first successful check offers that candidate for Compare/Create version; acceptance archives the manual baseline. Review shows preview source and linked/not-linked design source separately. Existing storage keys and contracts are unchanged.
