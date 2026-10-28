# Origin — Nuxt UI Source Composition (canonical)

Decision: The eight repositories are implementation ingredients for ONE Origin application, not a template catalog or marketplace. Keep one shell, one shared CSS, and enable real controls one feature at a time.

## Canonical app
- Deployable Nuxt app: ui/nuxt
- Preserved source library: ui/template-library/upstream/
- Active app single-source theme: ui/nuxt/app/assets/css/origin-theme.css, imported from main.css. Upstream template CSS snapshots are retained separately.
- Public entry / opens Origin Workspace at /workspace; /catalog is retired.
- No source template is exposed to users as a standalone demo, product or download.

## Eight source repositories and their integration roles

| Official repository | Role in Origin | Current integration |
| --- | --- | --- |
| nuxt-ui-templates/starter | Nuxt app foundation, reusable UI and responsive layout | Shared Nuxt foundation active |
| nuxt-ui-templates/dashboard | Consistent navigation, Overview, project and operational panels | Unified shell, /dashboard and local task progress |
| nuxt-ui-templates/editor | Authoring and editing patterns, rich-text documents | Phase 1 local plain-text code editor; upstream TipTap rich-text not yet transplanted |
| nuxt-ui-templates/chat | Contextual conversation interface | /chat local notes and persistence active; authenticated AI streaming pending |
| nuxt-ui-templates/saas | Workspaces, account controls, roles and settings | /dashboard local workspace actions active; real SaaS login/team features pending |
| nuxt-ui-templates/landing | User onboarding and external product entry | Pending real user journey; root is IDE by user request |
| nuxt-ui-templates/docs | Embedded documentation and guides | Searchable operational /docs active; full upstream docs tooling remains reference only |
| nuxt-ui-templates/changelog | Release and activity history | Verified static /releases timeline and filters active; live event stream pending |

## Active first vertical slice
- /workspace: select/open public GitHub source files; edit, copy, download or save within this browser.
- /import: read real public GitHub repositories via GitHub REST API. No token, private access, commit or push.
- /overview: real browser workspace state only; no simulated cloud metrics.
- /projects: current imported repository and clear-local-workspace action.
- /build: last independently verified AWS CodeBuild result and actual console link, NOT a fake build button.
- /loading: actual browser import/file-read state, otherwise idle.
- /catalog and /deployments: legacy preview pages redirect to integrated routes.

## Activation gates
1. GitHub App and Cognito authenticated private repository import, correctly scoped per user, server-side secrets only.
2. Persistent remote file snapshots and explicit Commit/Push with conflict handling and audit trail.
3. Isolated build runner, resource quotas, timeouts, job API, real build logs and deployment history.
4. AI agent with Bedrock streaming, per-project tools and cost controls.
5. SaaS accounts/settings and dynamic release feeds and onboarding only when their backend data and working controls exist.

Do not present saved upstream source code as already integrated functionality. Each feature becomes active only after real behavior and E2E verification. Cloudflare DNS, other user sites and the 14-stack backend are separate workstreams.


## Shared OKLCH theme and modular feature activation — October 24, 2026
- The custom primary and neutral scale is defined once in ui/nuxt/app/assets/css/origin-theme.css, using the 50–950 OKLCH values provided for Loading, Docs, SaaS Dashboard, Progress, Release Notes and Chat.
- ui/nuxt/app/app.config.ts maps Nuxt UI semantic colors to custom-primary and custom-neutral. The active app imports tokens once from main.css; no duplicate per-page token styles.
- /dashboard: real browser workspace summaries, action links, manifest export and repository URL copy. Not an authenticated SaaS team dashboard.
- /progress: a personal editable checklist with browser persistence and export. Separately displays dated platform capability verification, not a cloud job progress simulator.
- /docs: searchable operational guides with working route links and command copy.
- /releases: searchable and filterable release notes linked to source evidence, not a simulated changelog feed.
- /chat: locally saved note messages with export/delete actions; **AI chat is not connected**. No fake assistant response.
- /loading: reflects real browser import/file-read state, no sample progress bar.
- The authenticated agent chat, teams, private repository writes, project cloud builds and SaaS billing remain deferred until their backends pass E2E tests.
