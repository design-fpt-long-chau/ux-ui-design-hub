# Core acceptance finalization — 2026-09-28

> Current handover: [handover/README.md](handover/README.md). The three historical test-harness failures below were resolved in `86c42e9`; see the handover checklist for current validation.

## Confirmed fixes

- Legacy Screen metadata edits accept existing previewless States/Variants, retain their IDs and original option data, and hydrate saved local overrides after refresh. Newly authored representations still require screenshots.
- Deleting the currently viewed Group returns to its Business Unit overview after successful cleanup. Existing safety/rollback behavior is unchanged.
- Empty and populated Live Preview share one drop target and the file-picker upload callback. Unsupported, oversized, empty and multiple-file drops cannot publish or replace data; rejection is visible.

## Validation

- ESLint, TypeScript and production build pass.
- Full suite: 78 tests, 75 passed, 3 failed, 0 skipped. All six new upload handler tests and existing quota rollback/draft-preservation tests pass.
- Browser on isolated localhost:3003: legacy metadata edit saves and reloads; deleting the viewed disposable Group returns to its unit with other Screens intact; real PNG file-picker upload decodes and displays. Console has no blocking errors.
- Native desktop/File Explorer drag remains a manual check. Automated tests execute the actual empty-preview drop handler and the same image processing code as the picker, with mocked browser decoding APIs.
- Forced browser QuotaExceededError injection remains a MANUAL CHECK. Existing isolated storage tests confirm Flow rollback, draft preservation and actionable errors. No real storage was filled or cleared.

## KNOWN TEST DEBT (unrelated, not skipped)

These causes are present in baseline commit `b70a736`, before the acceptance fixes. The relevant assertions/loader and production call were inspected with `git show HEAD:<path>` before committing.

1. `tests/contextual-subgroup.test.mjs` — **Tree keeps every group structural and exposes canonical leaves through shared Flow rows**.
2. Same file — **Bottom creation creates top-level groups without a conflicting parent selector**.
   Both fail in the isolated module loader: it assumes every import except `screen-groups` ends in `.tsx`, attempts `src/lib/business-units.tsx`, and throws ENOENT. The actual module is `business-units.ts`. Neither test reaches its behavior assertions.
3. `tests/tree-flow-refactor.test.mjs` — **Tree, Flow detail, Add Screen and global index are wired to the shared Flow context**.
   Its source-text assertion expects `flowsForGroup(flowInventory, ...)`; baseline already uses `flowsForGroup(placementFlows, ...)` to exclude the edited Screen before calculating its insertion position. The assertion is stale; the shared selector remains in use.

No tests were hidden or skipped. This debt is not a Core Acceptance blocker under the requested acceptance criteria.

## Data scope

No storage keys, schemas or migrations changed. Browser-local data/previews are not part of this Git checkpoint. Browser mutation checks used only the isolated QA origin.
