# Origin AWS Operations Backend — actual deployed resources

Environment: AWS ap-southeast-1 (Singapore)
CloudFormation stack: `origin-operations-api-20261024`
Source-of-truth template: `infra/aws/origin-operations-api.cloudformation.json`
CloudFront frontend: https://d1x9cuojzyjcbw.cloudfront.net
API Gateway base: https://7a158myew1.execute-api.ap-southeast-1.amazonaws.com

## Actual API routes

| Verb | Route | Auth | Behavior |
| --- | --- | --- | --- |
| GET | /health | Public | No AWS changes; API service/region health |
| GET | /status | Public | Sanitized real recent CodeBuild jobs, statuses, timestamps and phases for **only** Origin UI fixed project |
| GET | /logs?id=UUID | Cognito JWT + `origin-operators` group | Up to 120 CloudWatch log messages for that fixed project's build |
| POST | /build | Cognito JWT + `origin-operators` group | Start **fixed** `origin-public-ui-build-20261024` project only, no request-supplied repo, command or branch |

Cognito user pool: `ap-southeast-1_KHW0AqL2a` (reused, not re-created)
Cognito SPA app client: `e7appf35fu05827fukilfqd0h`
Cognito domain: https://origin1auth20261023sdk.auth.ap-southeast-1.amazoncognito.com
Callback: https://d1x9cuojzyjcbw.cloudfront.net/auth/callback
Login strategy: Authorization Code + PKCE (SHA-256), random state and short-lived sessionStorage tokens.
Operator group: `origin-operators`.
Rate limiting: HTTP API default stage 10 requests/sec, burst 20; start additionally rejects while a build is active and has a 3-minute cooldown.

## Security boundaries
- The existing Cognito pool has **zero registered users as checked on 2026-10-24** and `AllowAdminCreateUserOnly=true`. Operator actions stay inaccessible until a specific account is explicitly invited and added to `origin-operators`.
- Do not enable self-registration, assign group membership, guess the owner's email or create an operator account without choosing the intended identity.
- Group memberships are enforced inside AWS Lambda AFTER API Gateway's JWT authorizer; the browser's local operator flag is cosmetic.
- No raw AWS credentials, OpenAI/Bedrock keys, GitHub tokens or access secrets are stored in the static app bundle.
- CodeBuild IAM permission is limited to the named existing frontend project. Logs use a fixed CloudWatch group.
- Origin frontend previews remain static; imports are real **public GitHub read-only** files, edited and saved locally. No arbitrary repo build is enabled.
- A brief Bedrock `Converse` call on `amazon.nova-micro-v1:0` returned `AccessDeniedException` due to AWS account verification. AI Chat is currently local notes; do not claim otherwise.
- To invite the correct operator account later, open the existing Cognito user pool in AWS Console, create/invite that user and add it to `origin-operators`. Do not modify the unrelated existing Next.js app client.
- Frontend and Lambda infrastructure use separate CloudFormation stacks. Existing DNS for other products remains unchanged.

## Frontend integration
- `useOriginOperations.ts`: live AWS data, refresh, operator-authenticated Build and log retrieval.
- `useOriginAuth.ts`: Cognito Hosted UI OAuth code + PKCE, browser session, guarded sign-out.
- `pages/auth/callback.vue`: verifies returned state, exchanges authorization code and redirects.
- `pages/build.vue`: live Build history, operator-gated Start Build and restricted CloudWatch logs.
- `pages/loading.vue`: live build phases and local GitHub import state.
- `pages/dashboard.vue`, `pages/overview.vue`, `pages/progress.vue`: real AWS status.
- Global `OriginShell.vue`: Cognito Sign in/Sign out button.
- No fake AI responses, fake deployment counters or unattended account billing actions.

## Verification
- CloudFormation stack reached `CREATE_COMPLETE`, later updated to support `GET /logs` with `UPDATE_COMPLETE`.
- External GET /health and GET /status returned HTTP 200 with real CodeBuild jobs.
- External unauthenticated POST /build returned HTTP 401 and **did not start** a build.
- Frontend Build/typecheck and browser E2E must pass independently before public rollout.

## Public frontend deployment verified

- Production release CodeBuild ID: `origin-public-ui-build-20261024:4cdb55ca-9d5e-45f1-96e9-0a92ca0253ef`
- Build status: `SUCCEEDED`; every CodeBuild phase passed; S3 sync and CloudFront invalidation completed.
- All three relevant CloudFormation stacks are `UPDATE_COMPLETE`; CloudFront distribution is `Deployed`.
- Exact frontend branch: `feat/origin-live-backend-20261024` (kept isolated from `main`).
- Browser E2E verified public /build loads 12 actual AWS CodeBuild jobs (latest #13 `SUCCEEDED`), Refresh live status, no publicly exposed logs, and Sign in to build button.
- Browser E2E verified /dashboard, /loading and /progress show matching actual AWS Build #13 phase results; no CORS/fetch errors.
- Cognito hosted sign-in opened from Build and showed a real email/password form at the expected domain; `code_challenge_method=S256` and callback to /auth/callback were present.
- Negative security tests: unauthenticated POST /build returned HTTP 401 with no new AWS Build; unauthenticated GET /logs returned HTTP 401 without leaking any logs.
- Not yet E2E verified: a successful operator login and its POST /build action, because there are zero registered accounts in the existing invite-only user pool. Do not claim operator action has been used until the intended email is invited and group membership assigned.
- Bedrock AI inference remains blocked by AWS account verification. Chat is still browser-local notes.
