# Troubleshooting

| Symptom | Safe action |
| --- | --- |
| Localhost refused | Start existing `pnpm.cmd dev --port 3000`; inspect occupied port/process. |
| First route slow | Allow initial compilation; inspect terminal error before restarting. |
| HOME previews absent on OFFICE | Expected browser-local separation; export/import an approved package, not fake seed images. |
| Wrong data after changing port/host | Return to original origin/profile; do not reset storage. |
| Quota/publish error | Keep draft, reduce oversized image input or export backup; do not claim success. Never clear storage as a fix. |
| Import blocked | Read validation/conflict warnings; original ZIP/schema required; clean restore cannot overwrite a used dataset. |
| Import plan stale | Re-preview after destination changes; do not bypass snapshot guard. |
| Partial rollback warning | Stop writes, preserve package, record error; seek recovery assistance. |
| Download not visible | Use explicit Download ZIP link; check browser downloads/permissions and saved file. |
| Missing role/contact/logout | Missing contact/role values are intentional. Local logout is enabled and ends only the memory session; FPT supplies real account/session capabilities. |
| Dirty git or divergent main | Stop and inspect exact files/commits; no reset/rebase/force push. |
| Figma connection not configured | Add server-only `FIGMA_ACCESS_TOKEN` to gitignored `.env.local`, restart, and retry. Manual upload remains available. |
| Figma no access/not found/rate limited | Verify file permission and exact frame URL; wait/retry for rate limits. Current remains unchanged. Never paste tokens into the browser. |
| Update candidate changed while reviewing | Reopen the latest comparison before accepting; LC intentionally rejects stale candidates. |

Collect route, steps, console error, app commit and browser/version. Redact personal data and preview bytes before sharing logs. Do not put browser exports/secrets into Git.

Local SSO is simulated: expected in Local mode; no provider call is made. Company mode fails closed until FPT supplies the real SSO adapter. Keep Library data intact when switching mode or testing login.
