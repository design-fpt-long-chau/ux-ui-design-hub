# LC Library Local Edition — portability v1

> Current handover: [handover/README.md](handover/README.md). The three historical test-harness failures below were resolved in `86c42e9`; see the handover checklist for current validation.

Settings → Data & Backup provides Export library, Import library, Create backup.
Export and backup use the same ZIP format. Backup records its kind and UTC timestamp.
A running local Next.js installation and modern browser are required. No cloud API,
auth service or upload service is used. This is local-server offline operation,
not an installable/offline-cached hosted PWA. External preview URLs and outbound
Jira/Figma links still need their original sources. Build/install dependencies
must be available before disconnecting from the network.

## Archive contract for FPT migration tools

ZIP uses STORE (uncompressed), UTF-8 filenames, CRC32 per entry; maximum 100 MB,
10,000 entries, no ZIP64/encryption/path traversal. Only exports in this format
are accepted; do not recompress with a different ZIP method.

- `manifest.json`: format `lc-design-library`, schemaVersion `1`, kind
  `export`/`backup`, createdAt ISO timestamp, counts, dataSha256, assets and warnings.
- `data.json`: products, groups, flows, screens, noteTypes, componentTags.
  Records retain stable IDs and unknown JSON fields. Screen records include all
  representations, metadata, state/variant lists, annotations and version history.
  Product/group membership indexes are derived from current canonical ownership;
  ordered Flow screenIds remain authoritative and unchanged.
- `assets/<sha256>.<png|jpg|webp|gif|avif>`: deduplicated image bytes. Manifest entries
  specify MIME and SHA-256. JSON uses `lc-asset://assets/<...>` references, resolved
  back to embedded data URLs by the Local adapter on import.
- `data.localRecovery`: exact parsed copies of recognized Local domain records,
  tombstones and saved draft, retained for recovery/FPT tools. This appendix is
  never applied automatically. Identity/profile, theme and authentication data
  are excluded. Imports always preserve the destination draft and preferences.

Locally embedded images and available relative/blob previews are bundled.
Unreachable/external images retain their references and appear in manifest warnings;
these references are not promised to work offline. No external host is fetched.
Counts for annotations deduplicate by Screen/platform/annotation ID across snapshots.
An export can contain private Library content; store/share it appropriately.

## Import safety and conflict decisions

The provider-agnostic `PortabilityRepository` exposes `exportLibrary(kind)`,
`previewImport(bytes,strategy)` and `applyImport(token)`. UI only calls this contract.
The Local adapter translates domain entities to existing storage keys.

Preview validates ZIP CRCs, JSON schema version, SHA hashes/counts, duplicate IDs,
route collisions, group depth/cycles, ownership and ordered Flow references.
No writes occur during export or preview. Review lists counts and every conflicting
stable ID. Acknowledgement is required before Apply import.

- **keep-existing**: add new stable IDs; retain matching local records.
- **use-incoming**: add new IDs; incoming fields win for matching IDs. Object fields
  absent from the incoming record are retained; supplied arrays (including Flow order)
  replace that matching record's arrays. Unrelated records remain.
- **restore-clean**: only if all recognized Local domain keys and draft are absent.
  Restore the package as the visible inventory, masking built-in seed IDs not present
  in the package with existing tombstone keys. Never available over saved local work.

Merge into locally deleted IDs is blocked; use a separate clean browser for recovery.
Cross-entity conflicts that produce orphan/cross-product references or route collisions
are blocked, not guessed. No migration or automatic cleanup occurs on startup/read.
Import tokens are held in memory, bound to the exact destination storage snapshot,
and invalidated by a changed destination or a new preview.

Apply uses the existing coordinated Local storage transaction and refreshes inventory
subscribers after success. A failed write rolls completed writes back in reverse order.
Quota injection tests verify byte-for-byte restoration. If browser storage becomes
unwritable even for rollback, the existing transaction reports incomplete rollback:
keep the package and stop; no browser-storage API can guarantee recovery from a browser
crash, disk failure or access revocation. Multi-device concurrency remains an FPT adapter
responsibility; local stale-preview detection is not server-side concurrency control.

## Verification

`node --test tests/portability.test.mjs` covers ZIP round-trip, IDs/order, images,
legacy fields, notes/states/variants, conflicts, draft preservation, stale previews,
clean-target guards, malformed/versioned packages and quota rollback.
Browser checks use localhost:3010 QA storage, separate from localhost:3000.
No real Library records are imported, replaced or deleted during QA.

### Session validation

- Current OFFICE export: 4 products, 29 groups, 24 flows, 65 screens, 2 assets,
  4 annotations. Export only; no import applied to localhost:3000.
- Isolated localhost:3010 fixture restore/re-export: 4 products, 29 groups,
  24 flows, 64 screens, 1 asset, 4 annotations; restored PNG and annotation
  rendered in Detail with Flow navigation. Original real package was not imported
  into the QA origin; the fixture tests cover the same archive/adapter path.
- Five portability tests pass, including quota rollback and zero-screen restore.
- Full suite: 90/93 pass. Existing debt remains in the two Tree/group test-loader
  cases and the source-wiring assertion for shared Flow context; no tests skipped.
