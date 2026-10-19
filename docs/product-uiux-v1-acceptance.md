# Product/UIUX V1 acceptance

> Current handover: [handover/README.md](handover/README.md). The three historical test-harness failures below were resolved in `86c42e9`; see the handover checklist for current validation.

Accepted: 2026-09-28. This checkpoint records the accepted Core, IA v1,
Authoring Journey, Viewer Journey, Consistency and Edge-case audits.
Product source baseline: `e3e6030`; the acceptance tag includes this document.

## Accepted scope

Home and Business Unit showcases; Screens inventory and filters; shared
Sidebar/Tree; Group/Flow galleries and Full Flow; Screen Detail and
States/Variants; Add/Edit Screen, previews, metadata and annotations;
Search, contextual navigation, theme switching and empty/error states.

## Canonical IA

**Business Unit → Structural Group → Flow → Canonical Screen → States/Variants**

- Structural Groups organize content and expand/collapse in the Tree.
- Flows own ordered canonical Screen IDs; Tree, Flow and Detail share that order.
- States/Variants belong to Screen Detail, never separate Tree nodes or Flow steps.
- Stable IDs and existing browser-local records remain backward-compatible.
- Delete image is distinct from permanent Screen deletion; Group/Flow cleanup
  must never silently delete canonical Screens or unrelated data.

## Accepted journeys and validation

- Authoring: Product → Group → Flow → Screen → preview/metadata → publish;
  second Screen, reorder, edit, rename, search, preview removal/restoration,
  confirmed deletion and disposable-record cleanup.
- Viewing: Home discovery → Tree → Flow → Detail/Full Flow → Prev/Next;
  Search/filters, another Flow, Back/Forward and deep-link refresh.
- Edge cases: empty/single/many Screens, empty Flow, missing preview,
  Coming Soon/Unavailable, long names, deletion/legacy references and quota
  rollback. Isolated browser stress fixtures included 24 Groups, 24 Flows,
  32 Screens in one Flow and 40 annotations; fixtures were cleaned afterward.
- Responsive widths: **1920, 1600, 1440, 1280 and 1024px**.
- Light/Dark consistency, interaction states and console were reviewed.
  ESLint, TypeScript and production build passed for the accepted source.

## Known non-product limitations

- Git synchronizes code only. localStorage, IndexedDB and uploaded previews
  remain machine/browser-local; missing HOME-PC previews on OFFICE are expected.
- Native desktop/File Explorer drop and forced browser QuotaExceededError
  injection remain manual checks. Shared upload-handler and isolated rollback/
  draft-preservation tests pass; native automation limits are not product failures.
- Known test debt remains: two fixture-loader failures incorrectly resolve
  `business-units.ts` as `.tsx`; a separate source-text assertion expects
  `flowInventory` where the implementation uses `placementFlows`. These are
  documented harness/assertion issues, not a claim that the full suite is green.
- Acceptance covers the recorded journeys and fixture scale, not an unlimited
  data-volume or exhaustive device certification.

## V1 freeze rule

**No new Product/UI features after this checkpoint unless required to resolve
a handoff blocker or bug.** Keep any such fix narrowly scoped, preserve IA,
stable IDs and persistence compatibility, and validate its affected journey.
Do not redesign the architecture, reset storage or introduce destructive
migrations as part of handoff. Feature expansion requires a separate,
explicitly authorized post-V1 scope.

## Supporting records

- [IA v1](ia-v1.md)
- [Core acceptance and test debt](core-acceptance-final.md)
- [Edge-case finalization](edge-case-finalization.md)
