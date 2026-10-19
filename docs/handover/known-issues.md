# Known issues and limits

Current package references: [sign-off summary](signoff-summary.md) and [receiver acceptance](final-acceptance-checklist.md). Dated test counts and drills below are historical evidence; the final product freeze records 141 passing tests.

- Local Edition is browser-origin storage plus a running Next.js server. It is not a hosted offline-cache/PWA or shared multi-user backend.
- HOME previews do not arrive through Git. Quota varies by browser; embedded images can consume space quickly.
- ZIP v1 accepts only its documented STORE format, not arbitrary compressed archives. External assets may be unavailable offline. Draft recovery appendix is not automatically restored; identity/theme excluded.
- Crash-proof transactions, remote concurrency, production Auth/SSO/RBAC/RLS, audit retention, hosting and operational guarantees are FPT responsibilities.
- Native File Explorer drag/drop and forced in-browser quota injection remain manual verification limits; isolated upload/rollback tests are automated. Do not label unavailable native automation as a product failure.
- The three old test-loader/source-assertion failures were fixed in `86c42e9`; the suite passed 93/93. Older acceptance/contract records describe their historical baseline, not current failures.
- Earlier localhost:3003 disposable QA records may remain pending separate deletion consent. This handoff drill uses separate origins and never clears that storage.
- Use a standalone checkout. Generated/build directories are not supported project roots and can interfere with framework source scanning.

Current drill status and any blocking defect are recorded in the [checklist](handover-checklist.md). No claim of exhaustive device, unlimited-volume or production security certification is made.

- Current login is a frontend contract/demo: no real FPT SSO, email delivery, token/session security, admin/member management or permissions engine. Local profile defaults use neutral Local User identity; company identity is supplied by FPT. Login itself is deliberately dark regardless of the Library theme.
- Final refresh: browser download-event automation timed out even though the ZIP was correctly saved to Downloads. Inspect the saved package rather than clearing storage/retrying destructive operations.
- Figma update detection is request-driven in Local Edition. There is no webhook/background sync; provider outages, permissions and rate limits are surfaced for retry while Current remains unchanged.


## Personal dependency cleanup — 2026-10-12

- REMOVE: personal Local identity defaults, seeded uploader/verifier names and generated test attribution were replaced with neutral Local User values. The Local reference identity is `local-user`; no default email/phone/role is supplied.
- DOCUMENTATION EXAMPLE — GENERALIZE: repository contract and architecture descriptions now describe the neutral Local identity; FPT supplies authenticated production identity and uploader/owner metadata.
- HISTORICAL DATA — KEEP: saved browser profiles and existing published attribution, annotations and version snapshots are user content. They are neither scanned into Git nor cosmetically rewritten. Saved profile fields continue to override neutral defaults.
- KEEP NON-PERSONAL CONFIGURATION EXAMPLES: `.env.local` mentions describe ignored local setup, never a shipped environment file. `qa@example.test` and QA usernames are synthetic test fixtures. No personal machine paths were found in tracked files. Recorded disposable Figma proof IDs/URLs in audit documentation describe past evidence, not a runtime dependency or credential.

Validation: 134 automated tests, ESLint, TypeScript and production build pass. Focused browser smoke covered Home, Screens, Flows/Tree, existing Detail/history, Full Flow, Add/Edit, Profile and Login; no captured runtime errors. No browser data was saved, deleted or migrated. Existing saved profile and historical attribution remain visible as intended.
