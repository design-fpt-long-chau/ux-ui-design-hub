# Architecture

Dependency direction: UI/React bindings → repository contracts → Local adapters. Future company adapters replace the composition point, not page-by-page storage calls.

- `src/app/`: Next.js App Router routes and global styling.
- `src/components/`: shared Tree, cards, forms, Detail/Flow, Settings UI.
- `src/types/design-library.ts`: canonical entities.
- `src/lib/repositories/contracts.ts`: repository interfaces; `drafts.ts`: authoring draft.
- `src/lib/repositories/provider.ts`: adapter composition point.
- `src/lib/repositories/client.ts`: client compatibility bindings/subscriptions.
- `src/lib/access.ts`, `access-client.ts`, `src/components/access/access-boundary.tsx`: in-memory auth UX controller and root presentation gate; no tokens/persistence. Company adapter is unconfigured/fail-closed by default; Local direct-entry bypass and memory-only logout/mock re-login are supported.
- `src/lib/adapters/local/`: inventory, products, assets, identity, preferences, portability.
- `src/lib/adapters/local/figma.ts`: provider-neutral browser adapter that calls server routes only; `src/lib/server/figma-api*.ts` owns Figma HTTP/token use.
- `src/app/api/figma/`: exact-node verification, PNG preview proxy and safe configured/not-configured status.
- `src/lib/flow-context.ts`, `screen-groups.ts`, `screen-platform.ts`: hierarchy, ownership/order and platform selectors.
- `src/lib/portability/`: package contracts, ZIP and package validation.
- `src/data/design-library.ts`: reference seed inventory, not HOME user data.

Local assets are embedded data URLs through FileReader; saved domain records reside in localStorage. Current Local adapters do not provide an IndexedDB database/backend. Browser storage belongs to the origin (scheme/host/port), profile and machine.

Reads merge compatible persisted overrides with seeds and runtime defaults. Never write migrations on read. Publish/delete/reorder/import use existing coordinated writes and rollback guards; browser crash or failed rollback is not database-level durability. Cross-device concurrency is not implemented in Local mode.

Inventory contracts expose synchronous stable snapshots and subscriptions. A remote adapter needs an agreed cache/error/concurrency strategy; swapping an async HTTP call into a synchronous method is not sufficient. Review the open decisions in the [integration contract](../fpt-integration-contract.md).

Figma update checks are pull-based in Local Edition. The accepted fingerprint and durable snapshot are persisted with the Screen; the latest provider result remains a single pending candidate until explicit acceptance. Version creation uses the existing coordinated local write/rollback path. OAuth, webhooks, background workers and production asset persistence are intentionally absent.

Separation check: UI/App code contains no direct localStorage/IndexedDB access or Local adapter imports. Only the composition root binds adapters. The Local `local-user` ID and demo author strings are fixture defaults, never authorization checks or required company identities. Preserve legacy IDs; FPT supplies its own IdentityProvider. No production credentials are shipped or required.


Local Edition uses the neutral `local-user` identity and `Local User` default name, with no default personal email, phone or role. Saved local profile fields continue to override defaults. No storage key or persisted Library record is migrated. Existing published attribution, annotations and version history remain user content and must not be rewritten for cosmetic cleanup.

Company-mode uploader/owner metadata must derive from the authenticated FPT IdentityProvider. FPT owns production identities; the neutral Local identity is not a production account or permission grant.
