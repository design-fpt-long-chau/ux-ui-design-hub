# Figma Sync + Versioning Contract

Status: **Frozen for handover**. Product/UIUX V1 and IA remain unchanged. The live exact-frame V1→V2 acceptance proof is deferred to the OFFICE PC and does not block this contract definition.

## 1. Screen source

Every canonical Screen may declare `sourceType: "upload" | "figma"`.

A Figma-linked Screen stores a provider-neutral `figmaSource` with:

- `fileKey`: exact Figma file identity.
- `nodeId`: exact linked frame/node identity.
- `url`: exact user-confirmed frame URL.
- `lastCheckedAt`: most recent completed provider check.
- `lastSyncedFingerprint`: fingerprint of the latest LC-accepted snapshot.

Resolved candidates expose `fingerprint`; after acceptance that value becomes `lastSyncedFingerprint`. Optional display metadata such as frame name may be retained, but provider credentials are never domain data.

LC always resolves the exact `fileKey + nodeId`. It must never infer a frame from the whole file, page name, selection, or filename.

## 2. Add Screen flow

The Figma source path is:

```text
Paste exact Figma Frame URL
→ parse fileKey + nodeId
→ verify the exact frame/node
→ request and render its real snapshot preview
→ user confirms “Use this frame”
→ continue the normal Add Screen flow
```

Parsing, verification, and preview loading create only a candidate. They must not replace an existing source or preview until the user confirms `Use this frame`. Manual upload remains a separate supported path.

## 3. Update detection principle

- **Current** is the latest durable version explicitly accepted into LC.
- **Figma Latest** is the most recent successfully resolved working state of the linked frame.

LC compares the Current accepted fingerprint with the latest resolved fingerprint:

- Same fingerprint → no update action.
- Different fingerprint → one pending update and the message `Có cập nhật mới từ Figma`.

Detection may update check metadata and the pending candidate only. It must never silently overwrite Current, create a version, or mutate the accepted snapshot.

## 4. Compare

Compare mode displays two durable views side-by-side:

- Left: **LC Current snapshot**.
- Right: **Figma Latest**.

V1 does not require a pixel-level diff engine. The user decides whether the provider change should become an accepted LC version.

## 5. Create version

Creating a version is an explicit acceptance action with these invariants:

1. The old Current already has a durable, immutable snapshot.
2. LC rechecks that the pending frame still matches the linked `fileKey`, `nodeId`, and URL.
3. The latest Figma image is saved as a durable snapshot.
4. The old Current becomes `Archived`.
5. Exactly one new version becomes `Current`.
6. The canonical Screen ID, ownership, Flow references, and Flow order do not change.

The operation is atomic at the repository boundary. Any validation, provider, image, quota, or persistence failure leaves the old Current untouched and rolls back coordinated writes. The Local adapter provides coordinated browser-storage writes with rollback guards; production transaction and asset durability are FPT responsibilities.

## 6. Version History

- The selector is a dropdown in the right-sidebar `VERSION` section when more than one version exists.
- Newest/Current appears first.
- Archived versions are selectable and read-only.
- Selecting an archived version displays its stored snapshot, never a live provider image.
- Missing historical metadata must not alter Current.
- `Back to current` restores the latest accepted version.
- Version selection never changes the canonical Screen ID or Flow context.

## 7. Multiple Figma edits

Many provider edits before acceptance produce **one** pending update:

```text
LC Current ↔ latest successfully resolved Figma state
```

A newer check replaces the unaccepted candidate. Checks never create intermediate versions. One explicit confirmation creates one new accepted version from the latest revalidated candidate.

## 8. Failure states

All failures are explicit, non-destructive, and retryable where appropriate:

- Invalid URL: parsing fails before a provider request.
- No access: configured credentials cannot read the file/node.
- Deleted or moved frame: the exact node is absent or no longer belongs to the linked file.
- API unavailable: network/provider/invalid-response failure.
- Rate limit: provider returns a throttling response; respect retry policy.
- Preview unavailable: node metadata resolves but no usable rendered image is available.
- Source changed or removed: invalidate the pending candidate; do not accept it against another source.
- Snapshot failure: roll back and retain the previous Current.
- Refresh while update pending: recheck from the accepted source; never infer acceptance from transient UI state.
- Missing archived snapshot: warn and fall back safely to Current; do not invent historical pixels.
- Legacy Screen without versions: resolve it as a valid Current baseline without destructive read-time migration; version history begins only through an explicit supported write.

Provider errors must not expose tokens or raw sensitive responses. Manual-upload Screens remain usable and do not perform Figma checks unless a source is attached later.

## 9. Detection modes

### Local/dev

- User-triggered `Check for updates` is the authoritative action.
- A Detail view may perform an optional on-open check when the last check is stale.
- Checks are pull-based and keep only one in-memory/persisted pending candidate according to the repository implementation.
- No webhook or background worker is required.

### Production/FPT

FPT defines and operates:

- OAuth/token issuance, storage, rotation, and revocation.
- Webhook endpoint and signature/authorization handling.
- Background worker, queues, deduplication, and retry policy.
- Production snapshot and asset storage.
- Provider rate-limit/backoff policy.
- Monitoring, auditability, incident response, and security controls.

Production automation may discover changes, but it must preserve the same rule: detection creates one pending update and never silently accepts it.

## 10. Ownership boundary

### LC delivers

- Source-selection and link-status UX.
- Provider-neutral Screen source model.
- Current/Archived version model and invariants.
- `FigmaIntegrationAdapter` contract: `parseFrameUrl()`, `resolveFrame()`, `getPreview()`, `checkForUpdate()`.
- Exact-frame confirmation, compare, accept-version, and history behavior.
- Local/mock/reference implementation.
- Contract tests, persistence safety tests, and handover documentation.

### FPT owns

- Production Figma OAuth/token lifecycle.
- Webhook endpoint and background synchronization.
- Production backend, database, and asset storage.
- Secrets, authorization, tenant isolation, and security controls.
- Retry/rate-limit operations, monitoring, alerting, and incident response.

LC UI/Core must continue to depend on adapter/repository contracts rather than provider-specific production infrastructure.

## 11. Deferred live acceptance criteria

The OFFICE PC live proof must use one editable exact frame and pass every item:

- [ ] Exact `fileKey + nodeId` resolves.
- [ ] Real rendered preview is shown in the correct aspect ratio.
- [ ] User confirms the candidate and publishes V1 Current.
- [ ] The same Figma frame is modified.
- [ ] LC detects one pending update.
- [ ] Compare shows V1 Current versus Figma Latest.
- [ ] User explicitly creates V2.
- [ ] V1 is an immutable Archived snapshot and V2 is Current.
- [ ] Version dropdown shows V2 Current first and V1 Archived.
- [ ] Selecting V1 displays its stored old image.
- [ ] `Back to current` returns to V2.
- [ ] Canonical Screen ID and Flow context are unchanged.
- [ ] Refresh/reopen preserves version history and Current selection.

Passing mocked contracts, unit tests, or a read-only provider file does not replace this deferred live proof.
