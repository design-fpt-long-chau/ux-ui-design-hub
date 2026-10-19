# Business Unit management

PRODUCTS supports inline creation, double-click/F2 rename, Enter/checkmark save,
and Escape cancellation. Draft products remain in component state until saved.
Names are trimmed, required, limited to 80 characters and unique ignoring case.
IDs and route slugs are generated once and retained when renamed.

The live Business Unit selector merges seeds with local overrides. Tree, Home
showcases, filters, Flow sections, Search, forms, tags and Detail consume that
inventory. Existing storage keys are unchanged. The additive key
`lc-library.phase1.business-unit-overrides` contains overrides and deleted IDs;
reads never write defaults or migrate Library records.

Deletion requires confirmation. Populated products additionally require a
destination product. Groups, nested relationships, Flows, ordered screen IDs,
Screens and the saved draft are reassigned while retaining IDs and record fields.
The product is hidden only after those writes succeed; quota failures roll back.
Conflicting group URLs/names, missing or cross-product references, malformed data
and unsupported legacy authentication ownership block deletion with an error.
Canonical Screens, assets, annotations and versions are not deleted by this action.

Validation uses an isolated browser origin and in-memory fixtures. Browser checks
cover creation/cancellation, Group → Flow → Screen publication, Edit, rename/reload,
Home/Tree/filters/Flows/Search, and deletion acknowledgement/destination/cancel.
Actual permanent deletion and rollback are verified with fixtures, not real browser
records. Test records and previews are not committed to this repository.
