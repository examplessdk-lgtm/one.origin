# ONEORIGIN trusted preview pilot

Status: preview pilot AND production creation/logs UI published after separate explicit user approvals. Feature branch pushed; no additional main merge was issued. The earlier production approval rejection is historical and was resolved by the subsequent explicit approval.

## Scope

A signed-in `origin-operators` member can build the public repository `examplessdk-lgtm/1origin`, directory `ui/nuxt`, using its committed package-lock and `npm run generate`. The branch resolves through the existing GitHub App broker to an immutable commit before CodeBuild starts. Browser edits are not included. Private repositories, arbitrary repositories, arbitrary build commands, SSR, webhooks, production promotion, custom domains and rollback are outside this pilot.

Existing production UI, CodeBuild project and GitHub credentials are reused for identity/source lookup only. The new build runs in a separate CodeBuild project, role, S3 bucket and CloudFront origin. It has no Secrets Manager permissions, no GitHub installation token and no write access to production. Source checkout is anonymous from the already public GitHub repository. Do not extend the allowlist without redesigning source access and build isolation.

## Public API (existing API Gateway, JWT required)

- `POST /previews`: `{ "requestId": "UUIDv4", "repository": "examplessdk-lgtm/1origin", "branch": "main" }`; returns 202 and actual AWS build metadata. No user-supplied command, IAM role, source URL, artifact destination or environment secrets.
- `GET /previews`: reads at most the latest 50 project builds, returns only this authenticated subject's records. Not a complete long-term deployment database.
- `GET /previews/logs?id=BUILD_UUID`: validates project and owner before reading the last 200 CloudWatch events. Recognized GitHub/AWS access key and bearer token patterns are redacted. This is not a guarantee to detect arbitrary secrets deliberately printed by repository code.

Owner identifiers are SHA256 hashes of Cognito subjects in CodeBuild metadata. These are ownership labels, not secrets. IAM limits control Lambda to the new CodeBuild project and existing broker, without direct credential access. JWT verification occurs at API Gateway; do not expose the Lambda through a public Function URL.

StartBuild uses a subject + request UUID idempotency token; SDK attempts are limited to one. AWS idempotency is bounded (not permanent). A timeout can occur after AWS accepts a build. The client never retries POST automatically and asks users to refresh actual history before starting again. A moving branch can produce different StartBuild parameters for a reused request ID. There is no durable outbox or exactly-once guarantee in this pilot.

## Build and publication

CodeBuild NO_SOURCE uses a platform-owned fixed buildspec, never repository `buildspec.yml`:

1. Validate commit and request ID; anonymous git fetch fixed repository at exact SHA.
2. `npm ci` in `ui/nuxt`; no platform secrets injected.
3. Generate static Nuxt output using `NUXT_APP_BASE_URL=/previews/REQUEST_ID/`.
4. Require nonempty index.html and successful build status.
5. CodeBuild's artifact handler uploads the static tree under `previews/REQUEST_ID/` in the separate bucket.
6. Only SUCCEEDED records expose `https://PREVIEW_DOMAIN/previews/REQUEST_ID/`.

A CloudFront viewer function resolves directory index paths. OAC keeps S3 private; previews are public through CloudFront and carry noindex headers. S3 default SSE-S3 encryption remains enabled even though CodeBuild-specific encryption is disabled. API and build log groups use a dedicated rotating KMS key. Preview objects expire by S3 lifecycle after seven days (asynchronous deletion); CloudFront cached responses can outlive origin deletion until their cache lifetime expires. This is not an access expiry guarantee. History may still contain expired URLs.

ConcurrentBuildLimit=1, timeout=15 minutes, queued timeout=5 minutes, seven-day log retention. These are limits, not a spending cap. New resources include CodeBuild, Lambda, S3, CloudFront, KMS and logging; cost depends on region, traffic and builds. Do not claim a fixed monthly cost without current pricing and usage assumptions.

## Security boundary

This is a trusted single-workspace pilot, not a public multi-tenant build sandbox. Repository dependency install/generation scripts execute with the preview build role and can write any artifact in this preview bucket and print to its logs. The role cannot modify production or read platform credentials. Builds have outbound internet and are not hostile-code sandboxes. The system has no rate-based daily spending quota. Do not admit untrusted users or repository code yet.

The generated preview is a static representation of this application. Existing Cognito callbacks are configured for the production origin; authentication inside a separate preview origin is not included. Public preview URLs must not contain confidential content. Source code in this pilot is already public.

## Files and deployment procedure

Generate the reproducible CloudFormation template:

```sh
python scripts/render-preview-infrastructure.py
```

After explicit approval for this new paid pilot:

1. Create a feature branch from current GitHub main; copy only preview files and relevant UI/CI changes onto the current base. Existing local import changes correspond to earlier published commits; do not overwrite main with the old local parent.
2. Run CI and create a reviewable PR; do not merge automatically.
3. Create the isolated CloudFormation stack using `infra/aws/origin-preview.cloudformation.json` with CAPABILITY_IAM. Check stack events, role policies and bucket policy before a build.
4. Run one actual allowlisted source preview, inspect every build phase, confirm artifact paths and fetch preview HTML and referenced assets from its CloudFront URL. Test directory routing and confirm production remains untouched.
5. Verify anonymous API calls return 401, signed-in operator can build/read its logs and a different subject cannot read them. Do not use synthetic Lambda invocation as evidence of browser JWT E2E.
6. Publish the approved frontend commit through the existing production UI release process with backup and rollback. Its persistent CodeBuild template currently pins an earlier approved source commit; update through CloudFormation, not unmanaged overrides.
7. Ask the user to test `/preview` after release. Never report a live preview or browser success until observed.

On rollback: revert the frontend release and remove new preview routes/stack if needed. The preview bucket has Retain protection; retained artifacts require explicit cleanup. Deleting a KMS key affects retained log readability and has a mandatory waiting period. No original resources need deletion.

## Verification evidence (2026-10-28 Asia/Bangkok)

- AWS read-only inspection: existing connector stack CREATE_COMPLETE; only the production CodeBuild project exists.
- Unit/security tests: 16 Node backend tests + 5 frontend client tests + 9 existing Python tests pass (30 total).
- Root ESLint passes.
- Nuxt typecheck exits 0, with existing vue-router Volar export warning.
- Nuxt static generation exits 0, with existing icon download warnings in this environment.
- AWS CloudFormation ValidateTemplate succeeds (read-only); this does not prove resource creation or IAM runtime success.
- User approved feature-branch push, isolated AWS pilot and one real preview build.
- Branch `feat/trusted-preview-builds`, initial app commit `d3736956e92fe2faab7ffc6fa452d59c6d74a9ca`. PR #3 was independently marked ready and merged through GitHub at 2026-10-28 04:04:14 Asia/Bangkok, producing main `7a9a9821d6f88179c8f62be651e47b49f71247cb`. No assistant merge command was issued. Follow-up runtime correction/evidence commit `c1042b01e8ccbee0f201c7c64389f97e140fd85a` is on the feature branch; that correction was not part of the already-merged initial PR.
- GitHub CI runs 40582653658 and 40582800454 succeeded for the initial app commit.
- CloudFormation stack `origin-preview-pilot`: CREATE_COMPLETE.
- Preview CodeBuild `Project-adkv63KGpsR1:1aa8c9f6-eed1-42f1-ab18-1da479b84de2`: SUCCEEDED, all execution/upload phases passed, 106 objects published. Exactly one preview build started.
- Source pinned to initial app commit above; request ID `9c19a12e-f296-461e-9f5b-9dd677f9eb9f`.
- Preview URL: https://d35kpxuofxch9l.cloudfront.net/previews/9c19a12e-f296-461e-9f5b-9dd677f9eb9f/
- HTTP checks: preview root, /preview/, /preview (directory rewrite), /workspace/ and three referenced CSS/JS assets all 200; assets use correct request-specific prefix. noindex headers present.
- Actual anonymous API GET /previews and /previews/logs return 401; CORS OPTIONS returns 204 with the existing production origin.
- Direct Lambda runtime tests: same-subject history/logs return 200, foreign-subject logs return 404, SUCCEEDED history returns actual preview URL. These use synthetic trusted authorizer claims under administrator test invocation and do NOT establish signed-in browser JWT E2E.
- CloudFormation UpdateStack on `origin-public-ui-codebuild-20261024` was rejected by automatic approval review: existing production build/publishing pipeline changes are outside the specifically approved isolated Preview scope. No workaround or retry was attempted. The assistant did not modify main; its independent GitHub merge is recorded above. Production buildspec, production bucket and production CloudFront release remain unchanged. The new button exists in the feature/preview source but is not live on the original production website.
- Preview-origin Cognito login is outside scope; do not tell the user they can log in/build from the static demo. The live creation/logs UI requires the separately approved production frontend release.
- Runtime inspection found AWS COMPLETED phases omit phaseStatus; presentation now derives final phase status from actual buildStatus rather than displaying IN_PROGRESS. This is a metadata-only follow-up; no additional preview build is required.
- Signed-in browser E2E has not been performed.

Final resource verification: preview stack UPDATE_COMPLETE; exactly one CodeBuild record exists; production index remains ETag `1dee2f9e68c9f84c073dc270756ffbef`, last modified 2026-10-28 01:13:02 Asia/Bangkok. Production buildspec still pins 9a5e1ba324ebf64e25b4320f44a9623634490d1b. Updated preview runtime returns COMPLETED=SUCCEEDED for the actual succeeded build. No production stack update was performed.

## Production UI release after additional approval

The user explicitly approved updating the production website/pipeline to expose the Preview/Logs interface without another merge. The previously rejected production action was then approved and executed; this was not an indirect workaround.

- Updated only BuildProject.Source.BuildSpec through CloudFormation; existing IAM/resources remained unchanged. Persistent source is versioned in infra/aws/origin-public-ui-codebuild.cloudformation.json.
- Production source is pinned to approved, CI-green commit `1fee655283e8813e5f54964036674480c7840d8b` on feat/trusted-preview-builds.
- Production stack origin-public-ui-codebuild-20261024: UPDATE_COMPLETE.
- Release build #15 `origin-public-ui-build-20261024:1e85b96d-fe22-409e-a7d3-5ecdbe1e6e6e`: SUCCEEDED, ended 2026-10-28 04:20:45 Asia/Bangkok.
- Previous public files backed up (118 objects) to `_origin_releases/build-15/` in the existing production bucket. New static assets uploaded first, HTML last with no-cache, old hashed assets preserved.
- CloudFront invalidation I5MI893EI6Q4G3PEKNC21QD551: Completed.
- Live page: https://d1x9cuojzyjcbw.cloudfront.net/preview
- Browser verification: existing Workspace shows the new Thai preview link; clicking it renders repository, main branch input, sign-in action and build history section. Clicking the action opens the existing Cognito email/password form with production callback and PKCE S256. No credentials were entered; returned to the published preview page.
- Browser console observations contained extension metadata transport errors only; no app-origin error was observed in the inspected entries.
- Signed-in browser build/logs E2E remains unverified; real source build and own/foreign log authorization were verified separately through the deployed runtime as documented above. The existing successful preview record belongs to the user's Cognito subject and should appear after their normal sign-in.
- No additional preview build was started: the existing preview pilot job remains the one real preview test. The production UI release build is a separate publication job.
- No new merge: main remains 7a9a9821d6f88179c8f62be651e47b49f71247cb from the earlier independent GitHub merge.

Rollback can restore files from `_origin_releases/build-15/` (HTML last), invalidate the existing distribution, and restore the previous CodeBuild source pin. Do not delete old assets or retained preview resources automatically.
