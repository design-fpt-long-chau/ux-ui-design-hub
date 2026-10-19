# LC Design Library — IA v1

## Canonical hierarchy

Business Unit → Structural Group (up to three group levels) → Flow → Canonical Screen → States / Variants.

- Structural Group rows organize children and expand/collapse; they are not Tree navigation destinations.
- Flows own ordered canonical Screen IDs. Tree, Gallery, Full Flow and Detail resolve this order through `screensForFlow`.
- States/Variants remain Screen-level representations. Their IDs must never be inserted as Flow steps or Tree leaves.
- Existing group-owned Screens without a named journey are exposed through the shared read-only default-Flow projection. No Screen is cloned and no migration writes occur.
- Dynamic Business Units follow the same selectors and ownership rules as the four seed units.

## Active seed inventory

| Business Unit | Structural Groups | Flows | Canonical Screens |
| --- | ---: | ---: | ---: |
| Nhà thuốc | 21 | 23 | 63 |
| Tiêm chủng | 0 | 0 | 0 |
| Xét nghiệm | 1 | 1 | 1 |
| Mẹ & Bé | 0 | 0 | 0 |
| Total | 22 | 24 | 64 |

OFFICE browser additionally shows Onboarding 1 (65 Screens total). Browser-local counts are not seed inventory and do not describe HOME storage. No new Business Units were visible on the OFFICE origin during this audit; a fifth-unit fixture verifies the same hierarchy and Search behavior without browser writes.

## Authentication compatibility

- `App Entry & Authentication` is excluded from active Tree/picker/filter presentation. Known legacy Screen ownership resolves to the current auth groups without rewriting records.
- Registration owns its four established Flows; Login owns default, Invalid Cases and VNeID, in that order.
- The legacy login journey retains `pharmacy.authentication` and its order. Its active name is `Luồng default`; the placeholder default definition is consolidated in the runtime projection.
- VNeID retains `pharmacy.registration-login.vneid`; both seed ownership fields and its compatibility anchor now point to `pharmacy.registration-login.login`.
- Compatibility IDs/slugs remain to support existing data and routes. They are not extra active structural nodes.
- Unknown legacy auth mappings still stop with an explicit mapping error rather than guessing or deleting data.

## Labels and context

Retain established labels, including Home, Checkout, Invalid Cases and Luồng default, consistently across consumers. This freeze does not introduce a translation policy or overwrite user-renamed labels. IDs/slugs remain independent of labels.

Search now derives every Screen's Group/Flow context from shared ownership and group-path selectors, removing the previous login-only special case. A Screen reused in several Flows remains one result with its contexts listed. Breadcrumbs resolve the current Group; Flow position/context remains supplied by the current journey.

## Validation and handoff boundary

- IA fixture checks: unique IDs; valid same-unit Group parents; valid Flow owners; valid canonical Screen references; no unassigned seed Screens; no States/Variants as Flow steps; no storage writes.
- Future-unit fixture: nested Group → Flow → Screen resolves in Search; stable IDs and unknown legacy fields survive unchanged.
- Browser: structural expansion leaves URL unchanged; Flows groups match Tree; VNeID route and Add Screen context agree; picker excludes compatibility anchors; legacy label search has zero results; non-auth Screen search includes parent/group/flow path.
- ESLint, TypeScript and production build pass. Full suite: 77 pass, 3 previously documented unrelated failures, 0 skipped (see `core-acceptance-final.md`).
- HOME browser-local records/previews were not available for an exhaustive data audit. The code contract is frozen; unseen ambiguous legacy records still require explicit mapping before any change.

No storage keys/schema changes, destructive migrations, Screen deletion, Flow-order changes or UI redesign.
