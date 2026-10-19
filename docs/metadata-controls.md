# Metadata compatibility

Jira URLs use the existing string fields. Ticket labels are parsed at runtime; key-only legacy values remain plain text. Links accept only HTTP(S), never invent a domain, and preserve the original URL. Related tickets retain the existing draft string and published array formats.

Components accept comma-separated names, string arrays, and existing component-reference arrays at runtime. New draft selections still use the existing comma-separated format; publishing still produces component references. Reading never rewrites storage.

The shared tag inventory combines Library components (including platform/version metadata) with explicitly created custom tags. Custom tag creation appends to the additive `lc-library.phase1.component-tags` key. No existing key is renamed or deleted. Invalid stored inventory data is not overwritten. Tag creation is independent of saving/publishing a screen; screen selections retain the existing Save draft / Publish behavior.
