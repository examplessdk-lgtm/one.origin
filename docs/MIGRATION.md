> Update 2026-10-28: the production origin is now connected to the existing AWS backend. See [Projects and Production](PROJECTS-PRODUCTION.md). Earlier migration-stage statements below about disabled operations describe the initial export, not current production behavior.

# ONEORIGIN migration handoff

## Source of truth

- Target repository: https://github.com/examplessdk-lgtm/one.origin
- UI source: Base44 app `6ae19df388768a7d60e9828e`, main branch; published design https://figma-make-app-60e9828e.base44.app
- AWS/legacy source: https://github.com/examplessdk-lgtm/1origin at `15e899e445e3d18381d509aa13a5e2378b44ff15` (contains the verified Nuxt-ready OAuth callback correction).
- Root is the Base44 TanStack Start application. Old Next.js demo/vendor templates are not copied; they were not the working production system. The complete active Nuxt UI is retained under legacy/nuxt.
- The target repository's original title `# one.origin 1origin.dev` is preserved in README.md.

## What moved, and what did not

Source code moved: Base44 pages/components/theme, Base44 entity schemas, original AWS backend and infrastructure generators, tests, current legacy Nuxt source, and a new React AWS Hosting integration. Base44 read tools were used; the live Base44 application was not edited or republished. No AI builder turn/credit-spending generation was requested.

Resources did not move: existing AWS stacks, GitHub App installation and server-side credential, Cognito users, Base44 records, OAuth connector grant, billing/subscriptions and production domains remain with their original services. Database/schema export is not a record migration. No user records, connector tokens, environment secrets, browser storage, private keys, deployment caches or .agents contents are included.

UI files are preserved except the added Hosting navigation link. Source paths are retained for Base44-managed server/error capture files. Do not rename/remove them or replace the Base44/Cloudflare/TanStack Vite plugin chain.

## Integration entry points

Hosting route `/hosting` is public to view. AWS actions require a separate existing Cognito operator login; no Base44 entity role or browser flag can grant AWS permissions. `/hosting/callback` finishes Authorization Code + S256 PKCE, rejects missing/mismatched state, and stores its separate short-lived session in sessionStorage. Tokens are not in URLs or source code. Base44 sign-in, registered GitHub connector and WorkspaceItem data remain untouched.

`src/lib/origin/client.js` sends real requests to the existing API only when enabled:

| Client method | Existing API |
|---|---|
| status | GET /status (public) |
| importRepository | GET /github/import |
| readFile | GET /github/file with immutable commit |
| previews | GET /previews |
| startPreview | POST /previews with caller-generated UUID |
| previewLogs | GET /previews/logs |
| consoleLogs | GET /logs |

The Hosting page supports authenticated source import, in-memory file editing/download, preview request, history/status, preview URLs and log viewing. It does not push edits back to GitHub. Ambiguous paid POST requests are not automatically retried; refresh history before another build.

Existing AWS allowlist is `examplessdk-lgtm/1origin`; the build worker is fixed to its committed ui/nuxt static app, with separate preview artifact storage. It must NOT be silently reused for arbitrary untrusted repositories or to execute this new TanStack SSR application. Keep the single trusted operator pilot boundary until isolation/quotas are redesigned.

## Before enabling the new site's AWS connection

This handoff intentionally does not alter production cloud security configuration. For the selected NEW deployed origin, after explicit approval:

1. Decide whether the new site remains on Base44 or runs elsewhere as the TanStack SSR Worker. Preserve Base44 backend integration if using its data/auth.
2. Add exactly `https://NEW_ORIGIN/hosting/callback` to the existing Cognito client's callback allowlist and `https://NEW_ORIGIN/hosting` to logout URLs; keep existing production URLs. Never use wildcard callbacks.
3. Add exactly the approved new origin to API Gateway CORS, retaining the existing CloudFront console origin. Allow Authorization and Content-Type for GET/POST/OPTIONS; do not disable authorization to fix CORS.
4. Set the public values in .env.example, then enable VITE_ORIGIN_ENABLED=true in that deployment. Never put AWS credentials, GitHub App private key, client secret or Base44 service-role token in VITE_*.
5. Verify actual operator sign-in/return/sign-out, anonymous rejection, own/foreign build-log isolation, one explicitly approved real build and its HTML/assets. A compilation pass or fixture token test is not signed-in browser E2E.
6. Keep the old console working until verified. Domain cutover, data migration, auth unification and changes to AWS allowlists are separate work, not implied by pushing this code.

New public IDs and old AWS resource ARNs are references, not credentials. Server-side GitHub App credentials stay in AWS Secrets Manager under the existing setup. Do not copy secrets out to Base44 or GitHub.

## Continuation prompt for an agent

"Continue examplessdk-lgtm/one.origin from README.md and docs/MIGRATION.md. Keep the Base44 UI/theme and existing Base44 auth/data code. Use src/lib/origin for the AWS connection. Inspect current cloud configuration read-only first. Preserve current production origins and exact Cognito PKCE checks. Do not turn a Base44 user token into Cognito authority, use asServiceRole as an authorization shortcut, or run arbitrary repository code with production IAM. Show a concrete plan/check before cloud changes or domain cutover. Do not assume Agent's scripted chat demo is a real AI integration."

## Local validation

Node tests cover PKCE callback/state validation, safe return navigation, separate session state, access-token header handling, disabled-origin gating and no automatic paid retries. Original backend authorization tests are retained. Build/lint and test results are recorded during the handoff. Build may emit upstream sourcemap/chunk warnings; those are not a production runtime verification.

Handoff validation completed locally: production build succeeded; lint succeeded; 23 Node tests and 9 Python tests passed (32 total). Upstream CSS sourcemap warnings remain non-fatal. Candidate Git files were checked as UTF-8 text and scanned for private key blocks, AWS access-key IDs and common GitHub/OpenAI token formats; no matches were found. This scan is a safeguard, not a guarantee to recognize every possible secret format. No real secret was read from AWS or Base44 during this migration.
