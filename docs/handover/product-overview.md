# Product overview

LC Design Library is an internal UI reference and authoring tool across dynamic Business Units.

Canonical IA: **Business Unit → Structural Group → Flow → Canonical Screen → States/Variants**.
Groups can nest up to three levels. Tree Groups organize and expand/collapse; Flows own ordered canonical Screen IDs. States/Variants belong to Detail, never independent Flow steps.

Delivered surfaces: Home showcases; Screens inventory/filters; Sidebar/Tree; Group and Flow contexts; Full Flow; Detail; Add/Edit Screen; Search; annotations/metadata/version information; Profile and Settings; Light/Dark/System; Data & Backup.

Author: create Product → Group → Flow → Screen → preview/metadata → publish → edit/reorder. Viewer: Home/Tree/Search → Flow → Detail/Full Flow → Prev/Next. Delete image is distinct from deleting a Screen; deleting a Flow must retain canonical Screens. Occupied Group/Product cleanup must reassign safely or block.

Accepted responsive widths: 1920, 1600, 1440, 1280, 1024px. Empty, missing-preview, Coming Soon and Unavailable states are intentional.

See [V1 acceptance](../product-uiux-v1-acceptance.md), [IA](../ia-v1.md), and the [current checklist](handover-checklist.md). Historical acceptance is scoped evidence, not unlimited volume/device certification.

Auth/access frontend delivery includes the centered `/login` entry, single FPT SSO CTA, SSO/loading, access-denied/expired/error states, logout and safe return routing. Local simulation is explicitly non-production. Recent Home quick-access and login visual refinements are included; this handoff adds no new features.

Figma-linked Screens keep a provider-neutral source identity and an accepted LC snapshot. Detail compares `Current` (latest LC-accepted version) with `Figma Latest`; an update never overwrites Current silently. Explicit acceptance archives the prior immutable snapshot and creates exactly one new Current version while preserving the canonical Screen ID and Flow references.
