# Product master re-audit — 2026-10-12

## Outcome and scope

Focused source review, automated regression and browser interaction review completed without changing the frozen IA, repository contracts, storage keys or persisted Library records. This is a frontend/Local Edition audit, not certification of FPT production infrastructure or the externally blocked live Figma proof.

## Confirmed findings and fixes

- MAJOR — the node metadata cache included the first caller's exact URL. Confirming a different URL for the same node could return the old URL, causing a source mismatch during version acceptance. Cache metadata only; attach each caller's exact URL after lookup. Same-node requests still coalesce.
- MAJOR — a previous Figma candidate remained actionable after changing the URL. Disable acceptance while checking or when the candidate does not match the input, guard the action itself, and explain why acceptance is unavailable. Keep the previous preview intact.
- MAJOR — source resolution/preview requests bypassed the update-check cooldown. The Local Figma adapter now shares a transient Retry-After/exponential cooldown across those request paths. Cached valid results remain reusable. Update checks preserve the adapter's absolute retry deadline instead of extending it on blocked clicks. No live API request was used to test this.
- MINOR — late source responses could attach metadata after leaving the form. Invalidate outstanding callbacks on unmount; no late draft/source mutation.
- PERFORMANCE — search rebuilt each Flow membership for every Screen. Index membership once per search; preserve matching, context, order and canonical IDs.
- PERFORMANCE — expired cache entries retained image data URLs until the same key was requested again. Prune expired entries on cache access; an older failed request cannot evict a newer cache entry.
- CRITICAL / DIRECTIONAL — none confirmed in this review. No architecture or IA redesign performed.

## Validation evidence

Browser, using a separate temporary tab and preserving the user's active draft:

- Home discovery, Tree structural expand/collapse without navigation, registration Flow order, empty Flow with scoped Add Screen link.
- Screens inventory, zero-result product filter, keyboard search selection into Detail, No Preview and missing Figma-link states.
- Detail to Full Flow, canonical ordered screen links and scoped Add more screens; Edit context/ID preselection; invalid optional Figma input did not block progression. No edit was saved.
- Grouped Flows page; collapsing registration left login expanded.
- Add Screen reused the saved manual draft. Step 0 Next worked; Step 1 showed all required name/platform errors and focused the first invalid control. Switching source disabled/enabled Next appropriately without losing the manual preview. No draft was saved or published.
- Profile used the existing saved identity, role remained read-only, Light/Dark switched correctly (Dark restored). Local logout returned to Login, sign-in disabled while authenticating and returned to the intended Profile route.
- Document overflow checks at 1920/1600/1440/1280/1024 for Home, Full Flow, Edit modal, grouped Flows and Profile; no page overflow observed. Visual samples reviewed in Light and Dark. This does not claim an exhaustive screenshot matrix of every state at every width.
- Browser error log was empty during these journeys.

Automated coverage includes source acceptance, exact URL cache reuse, 429 cooldown/recovery and fallback, invalid upload, source attachment/removal, pending updates, archived snapshots, duplicate-version prevention, canonical hierarchy/order, CRUD cleanup, annotations, quota rollback, portability conflicts/assets/restore, identity compatibility and mock access states. Tests use isolated fixtures, never real browser storage. Final suite: 141 tests passed, none failed or skipped. ESLint, TypeScript and production build passed.

## Manual verification and external limits

- Live Figma exact-preview/update/V1-to-V2 proof remains blocked by documented Starter/low quota. No retry-spam or live Figma call was performed. Use an editable frame with sufficient quota and respect Retry-After.
- Native OS File Explorer drag/drop, forced quota injection in a real browser, and production denied/expired/error SSO states require manual/provider integration verification; isolated automated upload, rollback and mock-access tests pass.
- Destructive CRUD/reorder/import/annotation mutation cases were re-run in isolated automated fixtures, not against the current real browser dataset. A fresh disposable-browser end-to-end mutation drill was not repeated in this pass.
- Back/Forward refresh received a browser smoke check, but a complete history/unsaved-form navigation matrix was not re-certified.
- Local cache/cooldown is transient and tab-scoped, not a production distributed rate limiter. The server must be running for Local Edition; no new PWA/offline cache is provided.

## Handoff boundary and safety

LC delivers Product/UIUX, frontend/core, Local repositories/assets/identity, contracts, portability and Auth/Figma UX with tests/docs. FPT owns backend/DB/storage, real SSO/session/RBAC/RLS, OAuth/token lifecycle, webhooks/background jobs, hosting, secrets, security, monitoring and operational backups.

No tracked personal identity defaults or personal machine-path dependencies were found in the targeted source/docs scan. The ignored environment file was not opened or committed; no token was printed. Existing saved profiles and historical attribution are user content and remain unchanged. No browser data was cleared, migrated, published, imported or deleted.
