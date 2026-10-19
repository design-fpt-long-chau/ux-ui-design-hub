# FPT integration contract — LC Design Library V1

> Current handover: [handover/README.md](handover/README.md). The three historical test-harness failures below were resolved in `86c42e9`; see the handover checklist for current validation.

Status: handoff specification, not production enablement. Validated against source
baseline `51c7b77` (2026-09-28). Product/UIUX V1 remains frozen. This document adds
no backend, authentication, permissions, migration or product behavior.

## 1. Authority and integration model

Auth/access frontend contract extension (2026-09-29): [handover/auth-access.md](handover/auth-access.md) documents `IdentitySession`, modes/states, method inputs/errors, identity mapping, logout and safe return behavior. It supersedes the earlier absence of session UX; FPT still owns actual authentication, session security and authorization.

Current executable definitions:

- [Domain types](../src/types/design-library.ts)
- [Repository contracts](../src/lib/repositories/contracts.ts)
- [Draft types](../src/lib/repositories/drafts.ts)
- [Composition point](../src/lib/repositories/provider.ts)
- [React bindings](../src/lib/repositories/client.ts)
- [Local inventory implementation](../src/lib/adapters/local/inventory.ts)
- [Local asset implementation](../src/lib/adapters/local/assets.ts)
- [V1 acceptance and known limitations](product-uiux-v1-acceptance.md)

Dependency direction: **UI / Product Core → contracts → Local adapters today;
approved company adapters later**. `repositories/provider.ts` is the composition
point. UI must not import storage SDKs, service credentials or concrete adapters.

Canonical IA: **Business Unit → Structural Group → Flow → Canonical Screen →
States / Variants**. Groups organize; Flows own ordered Screen references;
States/Variants remain within Screen Detail. Groups may nest to three levels.

In this document, **Current** means implemented Local behavior. **Production
requirement** is an obligation for company integration, not a claim that Local
mode already provides it. TypeScript required fields are not proof of runtime
validation. Empty arrays and documented empty strings remain valid legacy data.

## 2. Core entities

IDs are opaque stable strings. Preserve existing IDs through rename, reordering,
platform edits and reassignment. Do not infer ownership from an ID prefix for new
records; use relationship fields. Existing legacy prefix fallbacks remain part
of Local compatibility. Names and slugs are not primary keys. Preserve existing
routes or supply deliberate aliases when changing routing in a future integration.
Retain unknown legacy fields on round-trip; never replace stored records with
incomplete seed/default records. Reads must not migrate, delete or rewrite data.

### BusinessUnit

- **Required:** `id`, `name`, `slug`, `shortName`, `description`, `status`
  (`active` / `coming-soon`), `groupIds: string[]`.
- **Identity:** Local creation uses `product-<UUID>`; existing IDs need not follow
  this format. Rename preserves ID and slug.
- **Relationships:** Groups, Flows and Screens carry unit context; `groupIds` is
  also a stored relationship list and must not become a dangling reference.
- **Delete:** explicit acknowledgement required. An occupied unit requires a
  valid destination and reassignment of Groups, Flows, Screens and affected
  draft. Canonical Screens/assets survive. Conflicts or unsafe legacy ownership
  block deletion. Local mode uses a deletion marker, not physical database purge.

### Group (`ScreenGroup`)

- **Required:** `id`, `name`, `slug`, `sequence`, `description`, `screenIds`.
  **Optional in current type:** `businessUnitId`, `parentGroupId?: string | null`.
- **Identity:** preserve supplied ID on rename/move. New company records must
  carry explicit unit ownership; do not drop legacy optional-field support.
- **Relationships:** parent is a Group in the same unit; no cycles; maximum three
  levels including descendants. `screenIds` is a legacy/compatibility relationship,
  not the authoritative Flow order. Structural Tree rows expand/collapse only.
- **Delete:** no implicit child or Screen destruction. Empty delete checks
  children and drafts. Current permanent-delete command promotes direct child
  Groups to top level and moves directly owned Screens/Flows/draft into a same-unit
  `Ungrouped` destination. Unsafe mappings block. The legacy `delete` method has
  weaker guarantees; see §3.4 rather than treating the methods as interchangeable.

### Flow

- **Required:** `id`, `name`, `slug`, `description`, `businessUnitId`,
  `screenGroupId`, `status` (`active` / `coming-soon` / `unavailable`), `screenIds`.
  **Optional:** `parentGroupId`.
- **Identity:** rename and reorder preserve ID/slug. Local `createInGroup` generates
  a unique ID and available slug. Preserve existing IDs, including legacy aliases.
- **Relationships:** effective ownership uses the existing Flow-context resolver;
  new records set `parentGroupId` and `screenGroupId` to the same owning Group.
  `screenIds` is the authoritative ordered list of canonical Screen IDs. Empty
  arrays are legitimate. States/Variants are never Flow steps.
- **Delete:** remove/hide the Flow and its membership list; retain canonical
  Screens and their data. Clear company-side inverse references transactionally.
  Local mode removes the override and adds a tombstone; it has no server asset purge.

### Screen

- **Required:** `id`, `name`, `slug`, `sequence`, `businessUnitId`, `screenGroupId`,
  `description`, `whenItAppears`, `purpose`, `platforms`, `previewTone`,
  `currentVersion`, `jiraTicket`, `relatedTickets`, `versions`, `components`,
  `variants`, `states`, `evidence`.
- **Optional:** `preview?: string | null`, `status`, `figmaHref`, `uploadedBy`,
  `lastUpdated`, `annotations`, `versionHistory`, `representations`.
  `platforms` uses `iOS`, `Android`, `Mobile Web`, `Web`.
- **Identity:** one canonical ID across platform representations and revisions;
  do not create duplicate Screens to represent States/Variants. `sequence` is not
  a substitute for a Flow's `screenIds` order.
- **Relationships:** unit + Group context; Flow membership is stored on Flows.
  A Screen may be referenced by more than one Flow; do not impose single-Flow
  ownership without a separately approved contract change.
- **Delete:** confirmed canonical deletion removes the published record and all
  matching Flow/Group membership references, with a Local tombstone for seed IDs.
  Local deletion does not implement a general draft-reference cleanup service.
  Production must prevent stale drafts from accidentally resurrecting deleted
  entities. Image removal alone must never delete the Screen.

### Representation and State/Variant

- **Representation:** `ScreenPlatformRepresentation` requires only `status`.
  It is keyed by `mobile` or `web` inside `Screen.representations`; it has no
  separate `id`. Stable identity is `(screenId, platform)`.
- **Optional representation fields:** `preview`, `description`, `whenItAppears`,
  `implementationNotes`, `dimensions`, `currentVersion`, `versions`, `jiraTicket`,
  `relatedTickets`, `components`, `variants`, `states`, `evidence`, `figmaHref`,
  `uploadedBy`, `lastUpdated`, `annotations`, `versionHistory`.
- **State/Variant (`ScreenOption`):** required `id`, `name`; optional `preview`,
  `status`, `previewTone`, `description`, `order`, `isDefault`. Preserve option IDs
  and their annotation links. State/Variant ownership is its Screen/platform,
  not a new Tree node or canonical Screen.
- **Delete:** no dedicated representation/option repository delete exists.
  Changes are part of Screen publication. Reconcile affected annotation and asset
  references explicitly; deleting a preview does not imply deleting an option,
  another platform, historical versions or the canonical Screen.

### Asset

- **Current shape:** no `Asset` entity/interface or asset-ID field exists. A preview
  is an optional nullable string reference; Local import returns a data URL.
  References occur in Screens, representations, options, drafts and snapshots.
- **Identity:** preserve existing reference strings. Do not reinterpret a data URL
  as a provider object key. An eventual production asset ID must remain stable
  independently of temporary/signed delivery URLs.
- **Production metadata to agree:** durable asset ID, storage locator, media type,
  byte size, dimensions, ownership, lifecycle state and audit information. These
  are requirements for FPT design, **not fields already supported by Core**.
- **Delete:** detach only the intended reference first. Physical removal requires
  checking all live, draft and retained-version references and retention policy.
  No current `AssetRepository.delete` method exists. Orphan-upload cleanup and
  server garbage collection require a separately agreed lifecycle contract.

### Annotation (`ContextualAnnotation`)

- **Required:** `id`, `title`, `type`, `description`, `x`, `y`, `platform`.
  **Optional:** `typeId`, `variantId`, `stateId`, `component`, `jira`, `figma`,
  `severity` (`info` / `important`), `trigger`, `behavior`, `do`, `dont`, `isDemo`,
  `showOnPlaceholder`.
- **Identity/relationships:** stable annotation ID within the owning Screen;
  retain platform, option links and the existing coordinate convention. New
  custom note types use `typeId`; legacy display-only `type` values remain readable.
- **Delete:** no standalone Annotation repository. Update through the owning
  Screen. Preview replacement/removal preserves annotations unless explicit
  `clearAnnotations` is requested; unrelated platforms/options must survive.

### Version

- **`Version` required:** `id`, `label`, `date`, `note`.
- **`VersionSnapshot` required:** `id`, `version`, `status` (`current` / `archived`),
  `createdAt`, `lastUpdated`, `uploadedBy`, `description`, `whenItAppears`, `purpose`,
  `relatedTickets`, `components`, `variants`, `states`, `annotations`, `evidence`.
  **Optional:** `preview`, `jiraTicket`, `figmaHref`, `changelog`.
- **Identity/relationships:** preserve version/snapshot IDs and platform history.
  Labels are not IDs. Histories may exist both on Screen and representation.
- **Delete:** no independent Version delete method. Preserve archived snapshots
  and referenced assets during current-preview changes. Local preview updates may
  update a `current` snapshot; this is not an immutable server audit log.

### ComponentTag

- **Current catalog:** `ComponentTagRepository` stores `string` names, not entities
  with IDs. `register` trims and deduplicates names case-insensitively.
- **Embedded reference:** `ComponentReference` requires `id`, `name` within
  Screens/versions/representations. Current authoring derives reference IDs from
  names; do not claim these are globally unique server catalog IDs.
- **Delete:** no tag rename/delete repository methods. Preserve embedded existing
  references. Any production catalog identity/deduplication or deletion policy
  needs explicit mapping and must not silently rewrite legacy references.

### Identity

- **Current output required:** `id`, `displayName`, `initials`, `authorName` from
  `IdentityProvider.current()` (`Identity` contract). Optional profile fields: `fullName`,
  `username`, `domain`, `email`, `phone`, `role`, `title`, `status`. Missing values render
  as unavailable; role/title is read-only and is not a permission decision.
- **Identity:** Local mode initially returns `local-user`, `Local User`, `LU`, `Local User`.
  These are reference-mode values, not authenticated claims. FPT supplies a
  stable subject identity. Existing `uploadedBy`/`verifiedBy` strings remain
  readable and must not be assumed to be subject IDs.
- **Relationships/delete:** identity deactivation must not delete authored
  content. Retain attribution according to company policy. Optional `logout()`
  delegates session termination to the provider; Local mode does not implement it
  and exposes an unavailable action. Login, session expiry and account deletion
  are not methods in this interface.

### Supporting records

- `NoteTypeDefinition`: required `id`, `name`; predefined IDs are `builtin.*`,
  custom IDs `custom.*`. No delete/rename API; retain annotation references.
- `Evidence`: required `status`, `lastVerified`, `source`, `verifiedBy`, `notes`.
  Embedded metadata, not authorization or audit evidence from a trusted server.
- `ScreenDraft`: required `businessUnitId`, `screenGroupId`, `name`, `mobile`,
  `web`, `mobilePlatform`, `description`, `whenItAppears`, `purpose`, `uploadedBy`,
  `status`; remaining fields are optional as defined in `drafts.ts`. Local mode
  has one browser draft slot, no draft ID or cross-device ownership model.
- `RepresentationDraft`: required `id`, `type` (`state` / `variant`), `name`,
  `order`; optional `stateType`, `preview`, `description`, `isDefault`.

## 3. Current repository methods

### Common error and atomicity terminology

Methods are synchronous unless explicitly callback-based below. Mutations return
`void` except creation/lookup results shown. Local failures are thrown `Error` or
browser storage exceptions, **not typed error codes or HTTP responses**. Storage
access, serialization, malformed JSON, quota/security and failed rollback errors
can occur. Local readers sometimes fall back to empty/seed data; that behavior is
not a production outage-handling policy.

**R** = read-only; no persistent writes. **K** = one storage-key operation, not a
multi-record transaction. **C** = current `commitStorage` exception rollback across
listed keys. C does not guarantee crash/interruption safety, isolation, concurrent
writer protection or rollback success when storage stays inaccessible.
**L** = legacy sequential writes without coordinated rollback. **A** = asset read
into memory, no repository publication. All company compound writes require a
durable transaction or equivalent recoverable protocol, even where Local uses K/L.

Expected errors in each table supplement these common errors. Production must
add not-found, forbidden, conflict/stale revision, unavailable and validation
outcomes as appropriate; the current interfaces do not yet standardize them.

### 3.1 `Inventory<T>` (inherited by six repositories)

| Method / input | Output | Errors / atomicity | Ownership/context |
| --- | --- | --- | --- |
| `subscribe(listener: () => void)` | Unsubscribe function | Browser environment errors; R. No immediate callback promised. | Subscribe to relevant repository changes; stop notifications after unsubscribe. Local inventory uses storage/custom events. |
| `getSnapshot()` | `T[]` | Read/parse/context errors or documented Local fallback; R. | Stable array identity until data changes; callers must not mutate. Screens/Flows/Groups are normalized for legacy context; products and tag/note catalogs use their respective snapshots. |
| `getServerSnapshot()` | `T[]` | R; current implementation uses seeds or empty catalogs. | Deterministic SSR/hydration snapshot. Company SSR must not leak another user's data. |

Inherited by `ScreenRepository`, `FlowRepository`, `GroupRepository`,
`ProductRepository`, `NoteTypeRepository`, and `ComponentTagRepository` (six
concrete repositories; the first five are record inventories, tags are strings).

### 3.2 `ScreenRepository`

| Method / input | Output | Expected errors / atomicity | Ownership/context |
| --- | --- | --- | --- |
| `publish(screen, placement?, options?)` | `void` | Missing/incompatible Flow, invalid insertion anchor, invalid new Flow; C. | Upsert full Screen by ID. `placement={flowId, insertAfterScreenId: string \| null}`; null inserts first. Remove duplicate occurrence before insertion. `options={preserveDraft?: boolean,newFlow?: Flow}`; new Flow must match placement. Persist Screen, Flow placement/new Flow, tombstone changes and draft cleanup together. Local checks unit equality, not comprehensive server authorization/context validation. Full-record input must retain fields the caller is not editing. |
| `delete(id: string)` | `void` | Missing Screen; C. | Remove Screen plus matching Flow/Group `screenIds`; preserve unrelated records/order. Confirmation is a UI responsibility; no acknowledgement argument exists. No physical asset-GC API or general draft cleanup. |
| `updatePreview(id, platform, preview, clearAnnotations?, dimensions?, optionId?)` | `void` | Missing Screen; C via publish with draft preserved. | Platform is `mobile`/`web`; preview is string/null; dimensions are `{width,height}`. Targets canonical/default or specified option preview, representation and current snapshots. Null detaches preview; optional annotation clearing is explicit. Preserve archived versions and other data. |
| `saveDraft(draft: ScreenDraft)` | `void` | Serialization/storage failure; K. | Store complete draft in the existing browser slot, preserving extra legacy fields supplied. Does not publish Screen/Flow. |
| `loadDraft()` | `ScreenDraft \| undefined` | Current read/parse failures return undefined; R. | Existing browser draft only; no implicit write/reset. Company user/workspace scoping remains to be agreed. |
| `discardDraft()` | `void` | Storage failure; K. | Explicitly remove only the draft slot; no Screen/Flow/asset deletion. Never invoke as hydration cleanup. |

### 3.3 `FlowRepository`

| Method / input | Output | Expected errors / atomicity | Ownership/context |
| --- | --- | --- | --- |
| `create(flow: Flow)` | `void` | Duplicate ID/slug, invalid supplied parent/unit, duplicate sibling name when parent supplied; C. | Caller supplies full record/order. Local legacy records may omit parent; production must validate all Screen references and ownership. |
| `createInGroup(groupId, name, description?)` | `Flow` | Missing Group, blank/duplicate sibling name; C. | Trim name; generate stable ID/available slug; inherit unit/Group; create empty active Flow. Description defaults to `No description yet`. |
| `update(id, changes: Pick<Flow,"name" \| "description">)` | `void` | Missing Flow; C. | Preserve ID, slug, ownership and order. Local repository does not itself validate duplicate/empty rename; existing UI handles that. Production must validate on server. |
| `delete(id)` | `void` | Storage failure; C. | Remove override and tombstone ID; Local does not reject an absent ID. Never delete canonical Screens/assets. |
| `reorder(id, screenIds: string[])` | `void` | Missing Flow; duplicate, missing or extra IDs; C (no write for unchanged order). | Must be an exact permutation of current members. Shared order feeds Tree, Flow and Detail; do not use Screen.sequence to override it. |

### 3.4 `GroupRepository`

| Method / input | Output | Expected errors / atomicity | Ownership/context |
| --- | --- | --- | --- |
| `create(group: ScreenGroup)` | `void` | Duplicate ID, blank/sibling-duplicate name, invalid parent/depth/unit; C. | Caller supplies stable ID. New child must have valid same-unit parent at level 1 or 2. |
| `rename(id, name)` | `void` | Missing Group, blank/sibling-duplicate name; C. | Trim name; retain ID, slug, children and ownership. |
| `move(id, parentId: string \| null)` | `void` | Missing Group, cycle, cross-unit or subtree depth violation; C. | Null means top-level; validate entire affected subtree, not only moved row. Local does not add a full sibling-name conflict check here. |
| `deletionBlocker(id)` | `string \| undefined` | Read errors; R. | Reports contained Groups/Flows/Screens, legacy screenIds or draft; missing Group returns undefined, which is not proof it exists. |
| `permanentDeletionBlocker(id)` | `string \| undefined` | Converts planning errors to a message; R. | Dry-run safe reassignment plan, including missing/conflicting refs, unsafe legacy auth mapping and promotion conflicts; no records created. Revalidate at commit time. |
| `deleteEmpty(id)` | `void` | Occupied Group blocker; C; absent Group is no-op. | Tombstone only after checking descendants/Flows/Screens/draft. |
| `delete(id, destinationId?: string \| null, childAction?: "promote")` | `void` | Missing reassignment decision, invalid destination, missing promotion decision; L; absent Group is no-op. | Legacy method: moves directly assigned Screens, promotes children, removes override and tombstones Group. Null destination requests Ungrouped. **Does not coordinate owned Flow/draft reassignment or rollback. Not a production-safe general delete.** |
| `deletePermanently(id)` | `void` | Invalid/missing/cross-unit refs, unreadable data, unsafe legacy mapping, promotion collision; C. | Preserve Screens/assets; move direct Screens/Flows/draft to same-unit Ungrouped, promote direct children, tombstone selected Group last. Require explicit UI confirmation. No cascading content purge. |
| `findForRoute(id)` | `ScreenGroup \| undefined` | Malformed overrides fall back to seeds; R. | Read route-compatible override then seed. Caller currently canonicalizes legacy group ID. Unlike inventory lookup this preserves legacy fallback semantics and is not a deletion/authorization check. |

### 3.5 Supporting repositories

| Contract.method / input | Output | Expected errors / atomicity | Ownership/context |
| --- | --- | --- | --- |
| `ProductRepository.create(name)` | `BusinessUnit` | Empty, >80 characters, case-insensitive duplicate name; C. | Generate ID/slug, active status and empty groupIds. |
| `ProductRepository.rename(id, name)` | `void` | Missing unit; same name validation; C. | Preserve ID/slug and all content. |
| `ProductRepository.delete(id, acknowledged, destinationId?)` | `void` | No acknowledgement, missing unit/destination, invalid/malformed/cross-unit refs, conflicting names/routes or unsafe legacy ownership; C. | Empty unit may be tombstoned; occupied unit requires another valid unit. Reassign Groups/Flows/Screens/draft, update destination groupIds, then tombstone source. Never delete canonical content. |
| `ProductRepository.contents(id)` | `{groups: ScreenGroup[], flows: Flow[], screens: Screen[], draft: boolean}` | Read errors; R. | Snapshot of unit contents for decisions; not an authoritative concurrency lock. Recheck before delete. |
| `NoteTypeRepository.create(name)` | `NoteTypeDefinition` | Blank, >40 characters, case-insensitive duplicate including predefined types; K. | Trim and generate unique custom ID; preserve predefined IDs and legacy annotation types. |
| `ComponentTagRepository.register(name)` | `string` | Blank/comma-containing input, malformed stored catalog; K (existing match causes no write). | Trim; return case-insensitive existing name or store new name. No globally unique catalog ID is returned. |

### 3.6 Assets, identity, preferences and composition

The interfaces in this section are `AssetRepository`, `IdentityProvider` and
`PreferenceStore`; none inherits `Inventory<T>`.

| Contract.method / input | Output | Expected errors / atomicity | Ownership/context |
| --- | --- | --- | --- |
| `AssetRepository.importFile(file: File, ready: (reference: string) => void, failed?: () => void)` | Immediate `void`; success callback receives reference | FileReader errors call optional failed callback; setup errors may throw; A. | Local reads data URL only. UI currently validates formats/size and decodes images; import alone does not perform those validations or publish records. No upload owner parameter or structured error exists. Company upload must define scope and ensure no false durable-success signal. |
| `AssetRepository.resolve(reference: string)` | `string` | Local identity passthrough, no validation/network error; R. | Resolve an existing preview reference for rendering. Legacy URLs/data URLs must remain usable. No async signed-URL refresh method currently exists. |
| `IdentityProvider.current()` | `Identity`: required `{id,displayName,initials,authorName}` plus optional profile fields | Local reference identity plus optional saved profile overrides; R. | Attribution/display; Company adapter maps stable userId to id. Optional `mode`/`session` now express frontend access state; see the auth/access extension. |
| `IdentityProvider.updateProfile?(changes)` | `IdentityProfileUpdate` (displayName, optional fullName/email/phone) → `void` or `Promise<void>` | Blank display name or persistence error; failed writes preserve prior identity. | Only four profile fields; ID/username/domain/role/title and historical attribution stay unchanged. Local uses additive `lc-library-identity-profile-v1`; never writes on read. |
| `IdentityProvider.subscribe?(listener)` | Listener → unsubscribe function | No expected Local error. | Same-tab and cross-tab identity changes notify UI. |
| `IdentityProvider.getServerSnapshot?()` | No input → `Identity` | No expected Local error; read-only. | Stable reference identity during SSR/hydration. |
| `IdentityProvider.logout?()` | No input → `void` or `Promise<void>` | Provider may throw/reject; UI reports failure. Provider owns session termination consistency. | Optional capability for the current session only; must not delete Library data. Local adapter omits it. |
| `PreferenceStore.readTheme()` | `"light" \| "dark" \| "system"` | Invalid/blocked storage falls back to system; R. | Local browser preference, separate from domain data. Existing pre-paint theme bootstrap remains in place. |
| `PreferenceStore.writeTheme(mode)` | `void` | Storage failure; K. | Update only theme preference; UI may retain applied session theme if persistence fails. |

`LibraryRepositories` is a composition object, not another repository. Required
members: `screens`, `flows`, `groups`, `products`, `noteTypes`, `componentTags`,
`assets`, `identity`, `preferences`, and `persistenceNotice: string`. No methods.
React bindings consume its snapshots/actions; exported historical `*Local*`
action names in the compatibility facade do not authorize bypassing contracts.

## 4. FPT adapter requirements and open contract decisions

FPT may use an approved internal API, FPT Cloud, AWS/Azure, Supabase or other
corporate infrastructure. Provider SDKs and configuration belong behind adapters
or on the server. Core UI must not branch on the selected vendor. No particular
provider, endpoint, database schema or security certification is mandated here.

**The current interfaces are a Local reference boundary, not a complete remote
protocol.** Resolve the following before Company mode is enabled:

1. Mutations currently return synchronously and UI callers treat return as success.
   A remote adapter must not start fire-and-forget network writes behind `void`
   methods and falsely report success. Agree an asynchronous command/result and
   loading/error contract, or an explicitly approved durable-operation protocol.
   This is future integration work, not implemented by this document.
2. Define revision tokens, idempotency keys, transaction scope, error categories
   and retry/conflict behavior. They are absent from current method signatures.
   Do not silently use last-writer-wins for Flow order or full Screen updates.
3. Define identity/session/workspace ownership and server capabilities. Current
   identity has a frontend session-state contract; repository snapshots have no tenant parameter. Agree
   cache reset/isolation on identity changes and secure SSR behavior.
4. Define durable asset references, upload staging/finalization, signed-URL expiry,
   cancellation and garbage collection. Current callbacks/string passthrough
   cannot independently describe this lifecycle. Keep Local data URL compatibility.
5. Define per-user drafts and multi-device synchronization. The existing one-slot
   browser draft and storage event subscription are not a cloud sync service.
6. Address legacy deletion/route limitations explicitly: `GroupRepository.delete`
   lacks full cleanup/rollback, `findForRoute` can return seed fallbacks, and some
   readers hide malformed input behind fallback. Production must not expose
   deleted data or disguise unavailable services as a successful empty inventory.

Do not remove Local compatibility or migrate HOME-PC data implicitly to resolve
these decisions. Any import/export/migration requires a separate approved plan,
backups, validation and a non-destructive failure path. Git transfers code only;
OFFICE/HOME browser data and previews do not synchronize through Git.

## 5. Required production guarantees

| Guarantee | Acceptance condition |
| --- | --- |
| Stable IDs | Existing IDs round-trip unchanged; new IDs are collision-safe; rename/reorder does not recreate entities. Route aliases handle approved URL changes. |
| Ordered Flow IDs | Exact ordered canonical membership is shared by Tree, Gallery, Full Flow and Detail. Reject duplicate/nonexistent IDs and stale reorder requests. |
| Referential integrity | Validate unit/Group/Flow context, cycles/depth, option/annotation links and inverse indexes. No States/Variants as Flow steps; no unrelated content loss. |
| Asset lifecycle | Validate uploads server-side; stage safely; commit references before reporting publish success; retain referenced historical assets; safely collect abandoned uploads. Never equate image deletion with Screen deletion. |
| Concurrency | Use optimistic revision checks or equivalent isolation. Detect conflicts, preserve draft/user input, avoid lost updates, support idempotent retries and reconnect recovery. |
| Delete consistency | Authorization + explicit confirmation + transactional relationship cleanup. Block unsafe deletion; do not cascade canonical Screens when deleting organizational entities. Define retention/purge separately from Local tombstones. |
| Server permissions | Enforce every read/write/upload/delete/reorder on the server using authenticated scope. UI visibility is not access control. Do not trust Local actor strings. |
| Audit capability | Record authenticated actor, operation, stable entity IDs, server time, outcome and revision/change evidence per company policy. Existing editable metadata/history is not a trusted audit trail. |
| Multi-device consistency | Notify/invalidate caches across sessions, prevent stale resurrection, maintain consistent order/context, isolate users/workspaces and communicate offline/unavailable/conflict states. |
| Failure integrity | No partial Screen/Flow publication; no success before durable commit; keep draft and previous previews intact on failure. Prove crash recovery as well as ordinary exception rollback. |

## 6. Explicit ownership boundary

| LC Library handoff provides | FPT owns |
| --- | --- |
| Frozen Product/UIUX and canonical IA | Production database, schema operations and data governance |
| Frontend and existing core behavior | Production object storage and asset lifecycle |
| Local reference adapters and compatibility behavior | Auth/SSO and session lifecycle |
| TypeScript contracts, this specification and regression fixtures | RBAC/authorization and server-side enforcement |
| Recorded acceptance scope and known limitations | Secrets, credentials, rotation and deployment configuration |
| Integration clarification for agreed core expectations | Hosting, environments, backup/restore and disaster recovery |
| No production service/operator commitment implied | Monitoring, incident response, security and compliance |

Changes needed to close the open contract decisions require joint review. FPT
selects and operates infrastructure; LC Core should receive provider-neutral
capabilities/results. Production enablement requires named integration and
security owners and evidence, not merely successful compilation.

## 7. Integration checklist and release gate

**Adapter implemented → contract tests pass → staging data verified → asset
upload/delete verified → permissions verified → production enabled**

- [ ] **Adapter implemented:** agree §4 decisions; bind company adapters at the
  composition point; keep vendor dependencies out of UI; retain Local mode.
- [ ] **Contract tests pass:** verify all methods, errors, subscriptions, stable
  snapshot identity, SSR isolation, rollback, conflict/retry handling and atomic
  publish/delete/reorder. No hidden/skipped tests to declare success.
- [ ] **Staging data verified:** exercise 0/1/many Screens, empty Flows, legacy
  references, unknown fields, States/Variants, notes, versions, multiple units,
  drafts and repeated rename/reorder; compare IDs/counts/order before and after.
- [ ] **Asset upload/delete verified:** PNG/JPG/JPEG/WEBP, invalid/multiple input,
  read/upload failure, replacement and missing preview; confirm shared/history
  references survive, abandoned uploads are handled and no partial publish occurs.
- [ ] **Permissions verified:** test authorized/unauthorized reads and every
  mutation, cross-workspace access, expired session, signed URLs and audit actor
  integrity. Test server rejection independently of UI controls.
- [ ] **Production enabled:** obtain named sign-off; pass multi-device/concurrency
  and failure-recovery tests; verify secrets/monitoring/backups/restore and rollout
  rollback. Confirm there is no implicit browser-data migration.

Current Local reference evidence: persistence/legacy, upload, IA, publication and
boundary tests pass; ESLint, TypeScript and production build pass at the source
baseline. Three documented test-harness/assertion failures remain (two resolve
`business-units.ts` as `.tsx`; one expects `flowInventory` instead of
`placementFlows`). See the acceptance document. This is **not** a claim of a green
full suite or completed FPT contract testing. Native OS file-drop and forced
browser quota injection remain manual checks; isolated upload/rollback tests do
not replace production fault-injection and recovery testing.

No checklist item authorizes new Product/UI features. V1 remains frozen except
for separately approved handoff blockers/bugs.


## Local portability adapter

`LibraryRepositories.portability` implements `PortabilityRepository`:

- `exportLibrary(kind: "export" | "backup")` → Promise of filename, ZIP bytes,
  counts and warnings. Read-only; rejects unreadable records, invalid ownership,
  or package limits. Includes available local assets, no provider-specific IDs.
- `previewImport(bytes, strategy)` → Promise of opaque token plus counts, stable-ID
  conflicts and warnings. No writes. Rejects incompatible/corrupt packages and
  unsafe merged relationships. Strategies: keep-existing, use-incoming, restore-clean.
- `applyImport(token)` → Promise<void>. Requires the reviewed unchanged destination;
  rejects stale tokens or write failures. Local coordinated writes roll back on failure.
  FPT adapters must supply a real transactional implementation and permission checks.

See [Local portability v1](local-portability.md) for ZIP schema, recovery appendix,
asset/reference rules, clean-restore constraints and operational limitations.
