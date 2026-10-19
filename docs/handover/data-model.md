# Data model

Executable authority: [domain types](../../src/types/design-library.ts), [repository types](../../src/lib/repositories/contracts.ts), [drafts](../../src/lib/repositories/drafts.ts), [full entity/method contract](../fpt-integration-contract.md).

| Entity | Identity and relationships |
| --- | --- |
| BusinessUnit | Stable `id`, route `slug`; name/shortName/description/status and groupIds. |
| Group/ScreenGroup | Stable id; businessUnitId, optional parentGroupId, sequence, legacy screenIds. No cycles/cross-unit parents; max three levels. |
| Flow | Stable id/slug; businessUnitId, screenGroupId/parentGroupId; ordered `screenIds` is authoritative journey order. |
| Screen | Stable id/slug; businessUnitId/screenGroupId; platform list, metadata, evidence, versions, related tickets, components; optional `sourceType` and `figmaSource`. |
| Representation | Screen-owned mobile/web map; preview, status, metadata, States/Variants, annotations, version history. |
| Asset | Current Local contract is a reference string, not a separate production asset entity; ZIP stores deduplicated bytes by hash. |
| Annotation | Stable id; Screen/platform and optional state/variant context, coordinates, text, predefined/custom typeId compatibility. |
| Version | Stable id and recorded metadata/snapshots; exactly one Current per platform after version acceptance; archived snapshots are read-only and retain preview/source metadata. |
| ComponentTag | Current registry uses strings; Screen component references have id/name. Do not invent a production schema silently. |
| Identity | Provider id, displayName/initials/authorName and optional contact/title/status. Role is read-only; Local mode is not authentication. |

Preserve IDs on rename/edit/reorder. Preserve unknown legacy fields and absent optional values. Names/slugs are not primary keys. Resolve aliases using shared selectors, not duplicated branch-specific lists.

Deletion: Screen deletion removes its references with confirmation; preview removal retains Screen identity. Flow deletion preserves Screens. Group/Product deletion must safely promote/reassign or block; never cascade-delete Screens/assets implicitly. Local deletion markers suppress seeds; they are not physical DB purge semantics.

Import checks ownership, duplicate IDs, cycles/depth, route conflicts and Flow references before applying. Runtime compatibility may project legacy seed aliases; production migration must preserve that resolution deliberately.

`figmaSource` contains `fileKey`, `nodeId`, exact `url`, `lastCheckedAt` and `lastSyncedFingerprint`. It is additive and optional; legacy/manual Screens remain valid. Provider tokens are never domain data. Repeated provider edits before acceptance replace only the pending candidate; they do not create multiple versions.
