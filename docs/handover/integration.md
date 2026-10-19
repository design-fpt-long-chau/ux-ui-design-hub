# Integration

[Full FPT contract](../fpt-integration-contract.md) documents every current method, input/output, errors, atomicity and context requirements. [Portability format](../local-portability.md) is reusable by migration tools.

Contracts: ScreenRepository, FlowRepository, GroupRepository, AssetRepository, IdentityProvider; supporting ProductRepository, NoteTypeRepository, ComponentTagRepository, PreferenceStore and PortabilityRepository.

IdentityProvider now optionally exposes Company mode and IdentitySession for frontend access states. See [auth/access contract](auth-access.md) for method/state semantics, identity field mapping, safe return routing and mock QA. This adds no SSO implementation or server authorization.

FPT may choose an approved internal API/cloud/DB stack. Keep SDKs and credentials out of UI; bind company adapters at `src/lib/repositories/provider.ts`. Preserve Local mode as the reference implementation. No backend/Auth/RBAC is included here.

Production guarantees to implement: stable IDs; one ordered Flow source; no orphan refs; asset reference/lifecycle safety; concurrent-update conflict handling; atomic publish/delete/reorder; server-side permissions/RLS; actor/audit history; consistent multi-device reads; backup/restore.

Release gate (FPT): adapter implemented → contract tests pass → staging data verified → asset upload/delete verified → permissions verified → production enabled. Local regression tests do not certify production contracts or permissions. Agree tenancy, async cache/loading/error semantics, revisions/conflicts and asset lifecycle before implementation.

Do not use UI visibility or local identity fields as authorization. No automatic browser-data migration on startup. Data transfer must be explicit, validated and reversible where feasible.

The frontend exposes only `IdentitySession.login({returnTo})` through the FPT SSO CTA. FPT owns the redirect, verified callback/session publication, expiry, abuse prevention and any decision to add another authentication method. Local simulation must not be enabled in a Company adapter. See [current auth contract](auth-access.md).


## Figma frame source adapter

`LibraryRepositories.figma` exposes `parseFrameUrl`, `resolveFrame`, `getPreview` and `checkForUpdate`. The Local implementation verifies the exact node through server routes and converts the exported PNG to a durable data URL for the Local snapshot/backup pipeline, never persisting an expiring provider render URL. Errors retain distinct invalid/no-access/not-found/rate/unavailable/preview states and never expose tokens. Missing configuration leaves the app and manual upload operational.

Source metadata is additive: optional `sourceType: figma | upload` and `figmaSource` on Screens/drafts/version snapshots. Existing `figmaHref` remains compatible. Reads do not migrate old data; new publications retain image snapshots and exact frame identity. Changing a source keeps the prior preview until successful resolution, image decoding and explicit confirmation. See [Figma integration](figma-integration.md).
