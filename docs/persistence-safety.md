# Persistence safety patch

## Confirmed original read path

`useScreenInventory` -> `getSnapshot` -> `readPublished`, and
`useFlowInventory` -> `getFlowSnapshot` -> `readFlowOverrides`, automatically
called all four functions below. On the client, each ran whenever its marker
was absent/falsy, including during initial hydration. Reads could mutate storage.

All four read/wrote `lc-library.phase1.published-screens` and
`lc-library.phase1.flow-overrides`, read/conditionally removed
`lc-library.phase1.add-screen-draft`, and wrote their marker as `complete`.

| Function | Marker | Original destructive behavior |
| --- | --- | --- |
| `removeAppEntryDemoRecords` | `lc-library.cleanup.app-entry-demo-screens.v1` | Removed screens `pharmacy.app-entry.hehe` and `pharmacy.app-entry.asd`, removed their IDs from flows, and deleted matching drafts. |
| `removeLoginFlowDemoRecords` | `lc-library.cleanup.login-flow-demo-records.v1` | Removed records in `pharmacy.app-entry` named `hehe`, `asd`, `foundation test screen`, or `phase 1 test screen` (case insensitive); removed their flow references and matching drafts. |
| `removeAcceptanceTestRecords` | `lc-library.cleanup.acceptance-test-records.v1` | Removed `pharmacy.app-entry.otp-note-test`, `pharmacy.app-entry.acceptance-flow-first`, and `pharmacy.app-entry.acceptance-flow-second`, their flow references, and matching drafts. |
| `migrateLoginScreensToStates` | `lc-library.migration.login-screen-states.v3` | Removed canonical records with suffixes `lc-login-input-filled`, `lc-login-otp-default-with-suggest`, `lc-login-otp-filled`, and `lc-profile` under `pharmacy.app-entry-authentication`. Copied selected mobile previews into seeded states, replaced target identity/display fields, states and variants with seed-derived values, replaced authentication flow membership/order, and removed retired IDs from other flows. Deleted drafts named `LC Login Input Filled`, `LC Login OTP Default with Suggest`, `LC Login OTP Filled`, or `LC Profile`. Other retired metadata/representations were not comprehensively retained. |

## Change

Removed these functions, their automatic calls, and their now-unused constants.
Existing marker keys in browser storage are untouched and ignored. No storage
key is renamed or removed by this patch. No migration or new schema is added.

Screen records still override seeds as whole records by stable ID. Flow/group
overrides and existing deletion lists retain their existing semantics. Unknown
fields are retained by JSON parsing and whole-record selection. Preview, UI,
draft loading, and explicit authoring operations are unchanged.

## Regression validation

Run `node --test tests/persistence-safety.test.mjs`.

The test executes actual TypeScript readers/merge/preview resolvers in a Node VM
with an isolated Map-backed storage implementation and a hook-dispatch adapter.
It never writes fixtures into browser storage. Ten cases cover absent/present
markers and drafts targeted by the former routines. Fixtures include a seed-ID
collision, retired and demo-like records, uploaded data URLs, mobile
representations, states, variants, annotations, metadata, unknown fields,
custom group overrides, and ordered flows containing legacy/unknown IDs.

Assertions compare full records, draft JSON, flow ordering, preview resolution,
and every stored byte before/after repeated reads, cache invalidation and fresh
module loading (refresh simulation). They also assert zero storage mutation calls.

This verifies compatibility with representative current-schema legacy data;
it does not inspect the home PC or recover data removed by older code.
