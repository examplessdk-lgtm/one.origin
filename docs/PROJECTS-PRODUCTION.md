# Projects and Production

The ONEORIGIN interface at `https://os.1origin.dev/hosting` uses the existing AWS API, Cognito pool, GitHub App, CodeBuild project, S3 bucket and CloudFront distribution. The backend was not moved to Cloudflare or Docker Hub. Cloudflare continues to build and deploy the TanStack interface from `examplessdk-lgtm/one.origin`.

## Phase 1: Create project

Sign in with the existing Cognito operator account, supply a project name and branch, and create the project. The server verifies the connected GitHub source before writing a persistent, owner-scoped DynamoDB record. UUID request IDs make creation idempotent. The original console's callback and CORS origin are preserved alongside the new origin.

Current repository support is explicitly limited to `examplessdk-lgtm/1origin`, public GitHub contents, and its `ui/nuxt` static application. This release does not claim arbitrary-repository, private-repository, container, or SSR app hosting. The new TanStack console itself remains a real Cloudflare Worker, not static client files uploaded to S3.

## Phase 2: Production

Build the selected project. The backend resolves its configured branch through the existing App broker, passes an immutable commit and project/owner identifiers to CodeBuild, and exposes real build status, preview URLs and CloudWatch logs.

Choose a successful build and publish production. The service validates owner, project, successful status and artifact availability. It copies artifacts into an immutable `production/<projectId>/<releaseId>/` prefix and rewrites text artifact base paths, so JavaScript, CSS and HTML do not rely on expiring preview objects. Only after every object is written does a DynamoDB transaction mark the release READY and record the current production URL. A failed copy is recorded FAILED without changing the current URL. Release request IDs prevent duplicate publishing; ambiguous requests should be followed by refreshing history.

The existing bucket's seven-day lifecycle targets only `previews/`. Production objects and project metadata have no preview expiry. The builder role still cannot write production objects or project records. Publication is performed by the scoped backend role. Production uses the existing CloudFront hostname and an immutable URL; custom domains, an atomic stable-domain pointer and a rollback interface are future work. The distribution retains its existing noindex header during this operator-only rollout.

## API

All new routes use the existing API Gateway JWT authorizer and additionally require Cognito `origin-operators` membership in Lambda. Owner identity is derived from JWT subject, never from a client-supplied user ID.

| Route | Behavior |
| --- | --- |
| GET /projects | List up to 50 owner-scoped projects; indicates truncation |
| POST /projects | Verify source and persist project: requestId, name, repository, branch |
| GET /projects/{projectId}/previews | Owner/project-filtered build history, latest 50 project worker builds |
| POST /projects/{projectId}/previews | Start a pinned build using the stored project branch: requestId |
| GET /projects/{projectId}/production | List up to 50 owner-scoped release records; indicates truncation |
| POST /projects/{projectId}/production | Publish a successful project build: requestId, buildId |
| GET /previews/logs?id=... | Existing owner-authorized, redacted build logs |

Legacy `/previews`, `/github/import`, `/github/file`, `/status`, `/logs`, and `/build` retain their existing purposes. The new UI never calls legacy `/build`, because it deploys the old console rather than the selected project.

## Limits and operations

- Trusted operator workspace; not an untrusted multi-tenant sandbox or open signup service.
- One existing CodeBuild worker, concurrency and queue timeout unchanged. No Docker Hub account is needed.
- Publication is bounded to 1,000 objects, 100 MiB total, and 5 MiB per rewritten text object. Missing or expired preview artifacts must be rebuilt.
- Refresh and POST requests are not automatically retried. Polling reads project builds/releases every ten seconds.
- Cognito public client uses authorization code and PKCE. No AWS or GitHub credential is shipped in the interface. A 15-minute session requires fresh sign-in when expired; this release does not claim a new refresh-token flow or a merged Base44 identity.
- Production actions incur existing AWS build/storage/transfer charges; DynamoDB metadata is on demand with encryption and point-in-time recovery.
- UI operations activate only on exact `https://os.1origin.dev`; explicit `VITE_ORIGIN_ENABLED=false` disables them. New preview origins require an approved exact callback and CORS origin, not a wildcard.

## Validation

Run `npm run lint`, `npm test`, `PYTHONPATH=backend python -m unittest discover -s backend/tests -v`, and `npm run build`. Backend tests cover source verification, idempotency, subject isolation, branch pinning, cross-project build denial, expired artifacts, publication failures, and HTML/JS base-path rewriting. Infrastructure tests ensure inline Lambda source matches tested source, routes retain JWT authorization, and build permissions do not include production writes.

CloudFormation change sets add the project table and six API routes, modify the existing Lambda and scoped IAM policy, add the production prefix to existing CloudFront read access, and append the new UI callback/logout/CORS origin. No existing resource is replaced or deleted.

## Verified release — 2026-10-28 (Asia/Bangkok)

- Application commit: `fc0572aa3a9ba80f3a6ecd8f3f8bb0288baf0194`.
- GitHub Actions run `40727997079`: success. Cloudflare build `42065d52-c651-407d-b874-28ee2a1886b0`: success.
- Local lint/build passed; 46 Node tests and 9 Python tests passed. The built Worker passed 17 local HTTP readiness checks.
- Both AWS stacks reached UPDATE_COMPLETE. Changes had no replacements or deletions. Exact new-origin CORS preflight returned 204, and all six new project/production routes returned 401 anonymously.
- Real project `ONEORIGIN Production` was created for the existing operator account: `2f00ee5b-56b6-412e-a51b-1d06f0631247`.
- Real CodeBuild `Project-adkv63KGpsR1:5ef9e9cd-45e4-4a15-9544-257f29cbadc9` succeeded from `examplessdk-lgtm/1origin` main commit `7a9a9821d6f88179c8f62be651e47b49f71247cb`.
- Real production release `4b343074-e89c-49c8-b957-e4ebefa1ed14` reached READY, with 96 persistent production objects. Production root returned 200; 17 referenced JS/CSS assets and two nested pages returned 200. Checked text assets no longer depended on the expiring preview base path.
- Owner-scoped project/release reads succeeded; a different subject received 404. These backend checks used authorized administrative Lambda invocations with the known operator subject, not a fabricated browser JWT. API Gateway authentication was separately checked for anonymous denial.
- The deployed browser displayed both new phases, the Sign in button, and the production workspace. Sign in reached the actual Cognito form with the new callback, authorization code flow and PKCE S256; no credential values were read or entered, and an interactive signed-in browser session was not claimed as verified.

- All 17 public agent-readiness HTTP checks passed on the deployed `https://os.1origin.dev` after this release.
