# Origin AWS backend — stage 1

This branch adds a working control-plane foundation. It is not a finished Vercel replacement.
The original console remains a labeled sample. `/connect` is the separate live API client.
No AWS resources are created by installing, building, or running this repository.

## Delivered

- Cognito authorization-code + PKCE sign-in, state/expiry validation, sign-out.
- Access tokens stay in browser memory. Refreshing requires sign-in again.
- HTTP API JWT authorizer with an access-token scope; backend also rejects ID tokens.
- Tenant-bound project registration, paginated listing, and deployment history.
- DynamoDB on-demand storage with encryption and point-in-time recovery.
- Transactional deployment/outbox records and a DynamoDB stream dispatcher into encrypted SQS.
- Stream failure queue, build dead-letter queue, API throttling, retained data table.
- Next.js standalone Docker image and CI checks. No automatic deployment workflow.

A repository name is a registration, **not** proof of GitHub access. It stays `not_connected`.
Deployment POST returns **503 without writing any deployment** until a build worker is implemented.
The template hard-disables builds. Do not change this flag without implementing verified source
connections, immutable commit resolution, idempotency, sandboxing, quotas, build execution,
status reconciliation, hosting, logs, cancellation, and rollback.

## Architecture

Cloudflare DNS → AWS-hosted Next.js console → API Gateway → Lambda → DynamoDB.
Cognito authenticates the user. DynamoDB outbox → stream Lambda → SQS is prepared for future workers.

The original Aurora/Redis list remains a future plan. Stage 1 deliberately uses DynamoDB and
SQS to avoid running database/cache clusters for an empty workspace. No Aurora migration,
Redis, KMS customer-managed key, CloudFront distribution, or customer hosting is delivered here.

## Validate locally

```bash
npm ci
npm run lint
npm run build
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
python scripts/render-infrastructure.py
```

Unit tests stub AWS SDK boundaries. They are not live integration or browser E2E tests.
The Lambda Python runtime supplies boto3; the code has no extra deployment dependencies.

## Deploy the foundation (manual release)

Use an IAM deployment role with scoped permissions. Do not store AWS keys in GitHub or frontend variables.
The template creates chargeable resources. Review a CloudFormation change set before execution.

```bash
aws cloudformation validate-template \
  --region ap-southeast-1 \
  --template-body file://infrastructure/control-plane.json

aws cloudformation deploy \
  --region ap-southeast-1 \
  --stack-name origin-control-plane \
  --template-file infrastructure/control-plane.json \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides WebOrigin=https://1origin.dev CognitoDomainPrefix=YOUR-UNIQUE-PREFIX \
  --no-execute-changeset
```

Review the generated change set, then execute it explicitly. Use stack outputs `ApiUrl`,
`ClientId`, and `LoginDomain` for `.env.local` using `.env.example` as the key reference.
NEXT_PUBLIC values are embedded at Next.js **build time**; rebuild the console after changing them.

Create a test user through Cognito admin invitations; public sign-up is disabled.
Callback/logout URL is exactly `https://1origin.dev/connect` (or the WebOrigin you deploy).
No localhost callback or broad CORS origin is enabled by default.

## Check the real connection

1. Host the console on AWS with HTTPS; open `/connect`.
2. Sign in, register `examplessdk-lgtm/1origin`, and reload the project list.
3. Sign in as a second user: the first user's project must not appear.
4. An unauthenticated GET `/projects` must fail at the gateway.
5. Deployment POST must return 503 while the build worker is absent.

Do not populate `sample.ts` with real secrets. Environment-secret storage/reveal is not implemented.

## Operations and boundaries

- API lists at most 50 records per page and returns a cursor bound to the user and record prefix.
- SQS delivery is at least once. A future worker must deduplicate on deploymentId.
- DynamoDB Streams retains records for 24 hours. Alarm on dispatcher failures and monitor
  StreamFailures; repair/replay failed outbox rows before enabling builds. Outbox rows are retained
  for explicit replay/audit and need a retention policy before high-volume use.
- Queue messages include tenant ids; restrict operator access to queues and logs.
- Access tokens last 15 minutes. Cognito logout clears the hosted login; already issued access
  tokens remain valid until expiry. Immediate per-session revocation is not implemented.
- The table has Retain deletion policies: stack deletion does not delete tenant records.
- The current API allows project creation without quotas; keep access invite-only until quotas exist.
- Cloudflare DNS must be changed only after AWS hosting and its TLS certificate are ready.
- No AWS account id, token, or secret is committed to this repository.

## Remaining platform work

1. Verified GitHub App/CodeConnections authorization and repository import (OAuth handoff required).
2. Isolated build worker with immutable commit ids, concurrency/cost limits, retries and logs.
3. AWS hosting for static sites and Next.js SSR; preview URLs, promotion and rollback.
4. Secret management, teams/RBAC, custom domain verification and DNS/TLS automation.
5. Live console data integration, webhook signature/replay checks and browser E2E acceptance.

Analytics ingestion and electronic component search are outside this control plane.
