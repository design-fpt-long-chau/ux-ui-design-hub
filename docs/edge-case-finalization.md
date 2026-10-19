# Edge-case finalization — 2026-09-28

Browser audit used disposable port-3004 records: 24 Groups, 24 Flows,
32 Screens in one Flow, 40 annotations, long contextual names, and
Coming Soon/Unavailable Screens. No port-3000 Library records were changed.

Confirmed fixes:
- Bound Detail header content and truncate long breadcrumb/Gallery links.
- Keep Flow-position steps at least 72px wide with horizontal scrolling.
- Clamp Flow card names to two lines, preserving the full title on hover.
- Show Unavailable, rather than Coming soon, on unavailable Flow overlays.

Browser checks covered 1920/1600/1440/1280/1024 widths, Gallery and status
navigation, long-name picker wrapping, annotation selection/close (including
the last of 40 pins), and scrolling to the final Flow steps. Dragging QA
Screen 23 before QA Screen 22 updated the Tree and survived refresh.
Fixtures were removed using the existing CRUD APIs; the temporary fixture
route was removed before the final production build. Console was clean.

Known test debt: two tests in `group-annotation-interactions.test.mjs`
fail before assertions because their module loader defaults to `.tsx` for
`src/lib/business-units.ts`. The same extension-selection code exists in
the preceding commit 6aed53d. This is a test harness defect, not a product
runtime/configuration regression; it was not changed in this audit.
