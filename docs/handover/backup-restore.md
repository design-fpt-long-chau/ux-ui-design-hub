# Backup and restore

Settings → Data & Backup → Export library or Create backup. Both create one ZIP with manifest.json, data.json and assets/. Save the Download ZIP link to a safe location and verify the file exists; browser download handling can vary.

Included: canonical Products/Groups/Flows/order/Screens, metadata, representations, states/variants, annotations, versions, custom note types/component tags and locally available previews. The recovery appendix retains recognized raw records/draft but is not automatically applied. Identity/device preferences are excluded and destination drafts are preserved.

Import:
1. Keep a current backup before modifying an existing dataset.
2. Choose the original exported ZIP and a strategy.
3. Review counts, conflicts by stable ID, warnings and acknowledgement before Apply.
4. Open restored Screens and previews; compare IDs, Flow order and counts; re-export to verify.

Strategies: keep-existing adds new IDs and retains local conflicts; use-incoming replaces supplied fields/lists for matching IDs while preserving unrelated records; restore-clean works only when no recognized saved Library records/draft exist. Built-in seeds alone are not saved user data. Never clear a real browser to make restore-clean available; use a new QA origin/profile.

Package v1 uses uncompressed ZIP STORE, CRC32, SHA-256, 100 MB / 10,000-entry limits. Do not recompress. External/unavailable previews keep references and warnings, not promised offline bytes. Import rejects stale previews or invalid relationships; normal write failure rolls back. Browser crash/storage access revocation can defeat rollback; stop and preserve archives if recovery is incomplete.

See [complete format/limits](../local-portability.md). Export is a manual portable snapshot, not scheduled production backup infrastructure. FPT owns retention/encryption/access/restore drills.
