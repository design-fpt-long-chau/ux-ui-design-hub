# Local setup

Prerequisites: Git, Node.js and pnpm. Verified drill tools: Node 24.20.0 and pnpm 11.19.0 (the pinned packageManager). Use the existing pnpm lockfile; no package upgrades needed. First install requires registry/cache access. Local Edition needs a running local server, not cloud credentials.

Clone into a standalone project directory, not another repository's node_modules or generated output. The handoff drill encountered a development CSS scanner error in a nested checkout; the standalone clone passed unchanged.

```sh
git clone https://github.com/leoriclee1295-web/long-chau-design-library.git
cd long-chau-design-library
git checkout main
git status
pnpm install --frozen-lockfile
pnpm dev --port 3000
```

Windows PowerShell: use `pnpm.cmd` if script policy blocks `pnpm.ps1`. Open http://localhost:3000. Keep the process running; Ctrl+C stops it. If occupied, identify the process and reuse only this project or choose another port. A different port has a different browser dataset.

Validation:
```sh
pnpm exec eslint .
pnpm exec tsc --noEmit
node --test tests/*.test.mjs
pnpm build
```
For PowerShell, `node --test (Get-ChildItem tests/*.test.mjs).FullName` is an explicit test-file alternative. Production local serving: `pnpm build` then `pnpm start --port 3000`.

No environment secrets are required for Local/manual mode. Optional Figma frame verification reads `FIGMA_ACCESS_TOKEN` from a gitignored `.env.local` beside `package.json`; restart the server after adding it. Never use `NEXT_PUBLIC_*` for this token. Do not copy HOME browser data into source. Import a user-approved backup through Settings when transferring actual Library content.

Resume only with a clean worktree: `git fetch origin`, `git pull --ff-only origin main`. Stop on unexpected changes/divergence. Never reset/rebase/force-push to make setup pass.

Fresh-checkout drill procedure and its actual result are recorded in the [checklist](handover-checklist.md).

## Internal deployment

FPT internal-server deployment uses `pnpm build` and `pnpm start`, not the development server. Follow the [deployment runbook](deployment-transfer-status.md#internal-server-runbook) for process supervision, domain/HTTPS, environment and acceptance checks. No Vercel account is needed.

## Access modes

Unset `NEXT_PUBLIC_LIBRARY_MODE` for Local Edition. Direct Library entry bypasses login; Log out opens `/login` without removing saved data. The single SSO CTA is a Local session simulation. `NEXT_PUBLIC_LIBRARY_MODE=company` selects an unconfigured, fail-closed adapter until FPT supplies one. This public flag is build-time configuration, not a security boundary. Do not deploy Local adapters as production auth/data infrastructure.
