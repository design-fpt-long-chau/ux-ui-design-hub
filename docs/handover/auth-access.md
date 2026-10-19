# Auth / Access UX contract

Delivered 2026-09-29 as the explicitly approved access-layer extension to frozen Product/UIUX V1. This is frontend presentation/routing, **not authentication or authorization enforcement**.

## Modes and composition

Local remains the default: no login, unchanged local identity/data/keys. `IdentityProvider.mode` may be omitted by existing Local adapters. Company adapters set `mode: "company"` and supply `session` and `logout` at `src/lib/repositories/provider.ts`.

`NEXT_PUBLIC_LIBRARY_MODE=company` selects a fail-closed, unconfigured provider until FPT replaces it. Set this build-time public flag before `pnpm build` (or before starting dev); it is not a secret or a security control. The unconfigured build shows a generic auth error and never simulates successful SSO. Local repositories remain reference implementations; do not deploy them as a company datastore.

## Identity and access

FPT maps its stable `userId` to `Identity.id`. Map supplied displayName, fullName?, username?, email?, phone?, title?, role?, status? without inventing account data. The existing contract also requires presentation `initials` and attribution `authorName`; derive these from supplied names or use empty/neutral fallbacks. Domain is optional. `current()` must be a stable snapshot and may return an empty identity while signed out; it must return a nonempty stable ID before authenticated access. Missing profile values render `Not provided`. Role/title and stable identity are never user-editable. Status is displayed only when supplied, not inferred from successful login.

`IdentitySession`:

| Method | Input / output | Expectations |
| --- | --- | --- |
| getSnapshot | none → AccessSnapshot | Stable object until change. No side effects/writes, tokens or raw errors. Throwing becomes generic error UI. |
| getServerSnapshot | none → AccessSnapshot | Stable server-safe state, normally checking. The shared gate always initially renders checking in Company mode to avoid an unverified Library flash. |
| subscribe | listener → unsubscribe | Notify on session/access changes, including expiry/revocation. Do not throw; release listeners. |
| login | `{returnTo: string}` → void / Promise<void> | Same-origin sanitized Library destination only. Provider owns SSO redirect/callback validation and session checks. Transition to authenticating then authenticated allowed/denied, expired or error. Rejection becomes generic error; resolution while still unauthenticated/checking is treated as failure, not success. If redirecting, retain authenticating until navigation completes. |
| contactAdministrator? | none → void / Promise<void> | Open organization-supplied support. Errors are generic. If absent, UI explains contacting internal IT; no invented email/contact URL. |
| IdentityProvider.logout | none → void / Promise<void> | Required in Company mode. Terminate provider session and publish unauthenticated before resolving; success returns to entry. Reject on failure. Never delete Library records/previews/drafts. |

States: checking, unauthenticated, authenticating, authenticated with `access: allowed | denied`, expired, error. Role names are display metadata and are never interpreted as permission decisions. Provider session state and identity must be coherent before notifying. Invalidate stale async results and isolate caches on identity/tenant changes within the production adapter; the frontend gate is not a transaction/session system.

## Routing and UX

The current standalone `/login` is a centered dark login surface with one FPT SSO entry and no LC-owned email, password, signup or OTP controls. `/auth` remains a compatibility entry. Login is intentionally dark; the Library retains Light/Dark/System. No private inventory is loaded for the decorative background.

The shared gate renders checking/authenticating, allowed, denied, expired and error states. It waits during checking/authenticating before routing. Allowed identities return to the intended route; denied identities see administrator/logout actions; expired sessions offer re-login; failures offer Retry/Back. Local direct entry bypasses company login, while explicit Local logout opens the testable, memory-only simulated login. Neither logout nor login clears Library data.

Protected navigation uses `replace` to avoid auth history loops. Return paths are limited to known Library route shapes; external/protocol-relative URLs, auth routes, encoded separators and control characters are rejected. Only view/platform/businessUnitId/screenGroupId/flowId/status/q context parameters survive; callback/token parameters and fragments do not. FPT must validate return URLs again and own OAuth state/nonce/PKCE and callback processing. No callback/token parser is implemented here.

Login is single-flight with a disabled progress CTA, live status/error semantics and heading focus. Existing theme tokens and Light/Dark/System control are reused. Avatar/Profile reflect the provider; logout uses the shared controller. Add Screen resolves its initial author when opened after authentication, rather than at module import. In-progress unsaved UI may unmount on expiry; persisted drafts are not changed and no new automatic draft persistence is added.

## QA and limits

Focused controller tests cover Local bypass, server checking, duplicate submits, allowed/denied/expired/error, retry/logout, missing adapters/identity, safe return paths and sensitive-error suppression. All 99 tests, ESLint, TS and build pass at this checkpoint.

Actual browser test: isolated Local origin localhost:3014 and Company mock origin localhost:3015. Login → progress → Home, denied/contact/logout, expired → re-login, rejection → retry, error → Back, Profile identity, deep-link Full Flow refresh/re-login and Back/Forward passed. Home/Screens/Flows/Tree/Detail/Add/Edit opened normally after access; Local mode remained direct. Light/Dark/System, 1440/1280/1024 layout and console checks passed. Shipped unconfigured Company build was separately verified to fail closed without a mock.

The test-only `tests/fixtures/auth-identity.ts` is never imported by the shipped composition root. To repeat the browser drill, copy source into a disposable standalone checkout, bind only that checkout's identity to the fixture, build/run on an unused origin. `/auth?qaState=denied|expired|error|reject|allowed` initializes a mock state; `reject` fails the first login, then Retry succeeds. Mock state is memory-only, so refresh requires re-login. Remove the fixture binding before integration/deployment. No real credentials or Library fixture records are needed.

LC delivers UX, routes/states, provider contract and Local reference behavior. FPT owns SSO provider, directory, sessions/tokens, permissions/RBAC, account lifecycle, security policy and admin/member management. Real redirect/session durability, server permissions, secret handling and multi-tenant isolation require FPT implementation and staging verification. The client gate must never be relied on to protect server-rendered payloads, routes or APIs.

## Local logout and login entry

`/login` is the login entry; `/auth` remains supported. The Local adapter starts with access allowed on normal Library routes. Logout ends only its in-memory session and opens `/login`; loading or refreshing that route stays at Login. Its single SSO-labelled CTA is a local simulation, not real FPT authentication, and restores the same saved local profile after a brief authenticating state. No localStorage/IndexedDB records or preferences are written by this session flow. Explicitly running Local mode and opening the Library directly retains the login-free Local Edition; this is not a security boundary. Company adapters remain fail-closed and never use this Local mock.

## FPT SSO entry

The centered dark `/login` form exposes only `IdentitySession.login({returnTo})` through the FPT SSO CTA. The adapter owns redirect, identity verification and callback/session publication. Local mode simulates that same SSO transition without writing storage; Company mode never gains a local bypass. Any alternate authentication method requires an explicit FPT product/security decision and is not part of this frontend contract.

Browser validation: SSO loading/Home, logout back to Login, denied, expired and generic error states. No live provider call is made in Local mode.
