# ONEORIGIN GitHub App import — release candidate

Status: deployed after explicit owner authorization on 2026-10-28 (Asia/Bangkok).
Application source commit: `9a5e1ba324ebf64e25b4320f44a9623634490d1b` on
`feat/github-app-import`. `main` was not changed.
Base: `feat/origin-live-backend-20261024`, commit
`71ab03774ce25d086bf0ed6de55621b7b018d944`. Working branch:
`feat/github-app-import`.

## What changes

The Nuxt Import page retains anonymous public GitHub import and adds a
"Use connected GitHub App" option. Connected import requires Cognito access-token
authentication and `origin-operators` membership. It reads through a separate
Lambda rather than giving GitHub credentials to the browser.

The first release is deliberately a **single trusted workspace**, restricted to
`examplessdk-lgtm/1origin`. It is not a multi-tenant repository permission system.
All admitted operators can read that configured repository. Do not add users from
other organizations or expand the allowlist without a per-user/project access model.

- `GET /github/import?repository=examplessdk-lgtm/1origin&ref=BRANCH`
  resolves a branch to a commit and returns supported regular-file metadata.
- `GET /github/file?repository=examplessdk-lgtm/1origin&commit=SHA&path=README.md`
  verifies membership in the pinned Git tree before reading the blob. This avoids
  the GitHub Contents API's symlink dereferencing behavior.
- Secret `origin/github-app` supplies `appId`, `clientId`, `installationId`,
  `privateKey`. No OAuth client secret is needed for installation authentication.
- Installation tokens request only `contents:read` and the selected repository.
- No token/key is returned, logged, built into the UI, or stored in this repository.
- Connected source stays in tab memory, is cleared on sign-out/session replacement,
  and is not written to localStorage. Download edits before refreshing or closing.
- Supported file size: 256 KiB; UTF-8 text only; maximum 1200 supported files.
  Truncated trees fail instead of claiming a complete import.
- Common credential filenames are excluded. This is not a general secret scanner;
  credentials committed inside ordinary source files must still be removed/rotated.
- No commit, push, arbitrary build, preview hosting or deployment is added.

## Infrastructure

`scripts/render-github-infrastructure.py` embeds `backend/github-app.cjs` in
`infra/aws/github-app-import.cloudformation.json` without reading secrets or
calling AWS. The new stack attaches two JWT-protected routes to the existing
Operations API and uses its existing authorizer. It does not update the existing
Operations Lambda, Build project, Cognito pool, frontend distribution, or DNS.

Lambda IAM can read only the one configured secret ARN and write its own logs.
It cannot start builds, update resources, or write repository contents. The account
currently has a concurrency quota of 10; Lambda's minimum unreserved-capacity rule
prevents reserving two executions. The connector uses the shared account pool and
the existing API stage throttling. Each GitHub request has a timeout,
response-size limit and redirects disabled. Responses use `Cache-Control: no-store`.

The template is for the already verified Singapore account/API. The defaults contain
resource identifiers, not credentials. Verify account, API and authorizer again
before executing a change set.

## Verification performed

- 8 backend behavior/security tests and 2 frontend API-client tests passed.
- Existing Python backend suite: 9 tests passed.
- Final root ESLint and Next.js production build passed after separating workspace
  compiler/lint scopes. Type checking was not disabled.
- Nuxt typecheck exited successfully. Existing Vue router tooling emitted a
  `vue-router/volar/sfc-route-blocks` export warning.
- Nuxt static generation succeeded. Remote icon retrieval warnings occurred in
  this environment. Browser E2E was blocked: the available Playwright Chromium
  download returned an invalid/truncated archive. No browser-E2E success is claimed.
- AWS `ValidateTemplate` accepted the connector template (`CAPABILITY_IAM`).
- Direct integration test ran the actual new handler on CloudShell with the real
  Secrets Manager credential: import HTTP 200, 682 supported files at commit
  `71ab03774ce25d086bf0ed6de55621b7b018d944`; README read HTTP 200, 1590 characters,
  commit matched. The token/key were not included in returned results.
- This integration test invoked the handler directly using a test request context;
  it does **not** prove deployed API Gateway authorization or browser login.
- Cognito had no registered users at verification time. No account was created,
  invited or granted operator access. The intended user's email is required before
  provisioning access.

Root ESLint was applying React rules to vendored Vue/Nuxt code (202 errors in the
initial broad run). Root lint now excludes `ui/**`; Nuxt is independently checked
with its native typecheck/generate/client tests in CI. No vendored template was edited.
The root Next.js TypeScript config also included every vendored Nuxt/Vue source
file and failed production builds with missing framework globals/dependencies.
It now excludes the independent `ui` workspace, whose own compiler remains enabled.

## Checks

```bash
node --test backend/github-app.test.cjs ui/nuxt/test/github-import.test.mjs
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
python scripts/render-github-infrastructure.py
npm run lint
npm run build
npm ci --prefix ui/nuxt
npm run typecheck --prefix ui/nuxt
npm run generate --prefix ui/nuxt
```

Node 22 CI uses `--experimental-strip-types` for the frontend TypeScript client test.

## Production verification

- GitHub Check run `40557102034`: success.
- Connector stack `origin-github-import`: `CREATE_COMPLETE`.
- Actual deployed Lambda imported the new branch: HTTP 200, 689 supported files,
  commit `9a5e1ba324ebf64e25b4320f44a9623634490d1b`.
- CodeBuild `origin-public-ui-build-20261024:195ef48a-5105-4c7d-b8d3-332813a0a62c`:
  `SUCCEEDED`, including frontend tests, typecheck, static generation, backup,
  S3 publication and CloudFront invalidation.
- Anonymous external GET `/health`: 200. Both `/github/import` and
  `/github/file`: 401. External `/import/`: 200, new App option present.
- A Cognito operator account was created and its password-change status confirmed
  before release. No password or login token was read by the implementation agent.
- Successful signed-in browser import has not been observed; it remains a user
  acceptance check. Direct Lambda tests do not replace it.
- Prior root frontend objects are backed up at
  `_origin_releases/pre-9a5e1ba3/` in the existing static bucket. Existing hashed
  assets were retained for old browser sessions. HTML was published last.
- The existing CodeBuild CloudFormation stack is `UPDATE_COMPLETE`; its persistent
  BuildSpec now pins the approved application commit. A later click on Start Build
  therefore does not silently restore the old branch. Subsequent builds back up
  to `_origin_releases/build-$CODEBUILD_BUILD_NUMBER/`.
- `infra/aws/origin-public-ui-codebuild.cloudformation.json` records this updated
  Build stack. The connector and Build stack templates contain no credential values.

## Future release gate

1. Review this branch/diff and the new CloudFormation template.
2. Confirm which email should be invited to the existing Cognito pool and given
   `origin-operators` membership. Do not guess or invite other accounts.
3. Push the feature branch only after authorization; keep `main` unchanged.
4. Review and execute the new connector stack change set. Confirm existing public
   `/health` and `/status` still work; unauthenticated new endpoints must return 401.
5. Publish the tested Nuxt output through a separately approved frontend release.
   The existing Console CodeBuild uses the old branch; do not blindly trigger it
   and expect these unpushed changes to appear.
6. As the chosen operator, verify App import, file opening, sign-out, denied access
   for a non-operator, and denial of a repository outside the allowlist.

Rollback: restore the previous frontend artifact/release and delete only the new
connector stack to remove its two routes and Lambda. Retain the GitHub secret.
Existing Console Build behavior and public import remain available.
