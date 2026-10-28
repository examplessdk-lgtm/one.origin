# Origin Neon backend: private Object Storage

This adds Neon Functions and Neon Object Storage **without replacing** the existing AWS Cognito, API Gateway, DynamoDB, SQS, or Lambda control plane.

## Architecture

Cognito signs users in via /connect with PKCE. The same access token authenticates requests to a Neon Function at /files. The function verifies the RS256 signature (Cognito JWKS), issuer, client_id, token_use=access, and expiration before accessing a **private** bucket named origin-files. Objects use users/{Cognito sub}/{UUID}/{safe filename} keys. List returns at most 30 entries for the caller, and download links expire after 120 seconds. Upload is limited to 10 MiB.

Storage credentials are automatically injected into Neon Functions and must not be placed in frontend variables or GitHub. This is a foundation for user uploads, not a live build-artifact store. Public sign-ups should remain disabled pending quotas, content scanning, and operational alerts.

## Deploy

Use Neon in supported region **aws-ap-southeast-1 (Singapore)** if available in your account.

1. Deploy/configure Cognito following docs/backend.md, including a Cognito app client.
2. On the machine with a logged-in Neon CLI, from this repository: `neon link --no-config`; choose the **correct Neon project**. Then `neon checkout main` (or a test branch).
3. Configure the following in a local, git-ignored `.env.neon` (never commit the file):

```dotenv
ORIGIN_WEB_ORIGIN=https://1origin.dev
ORIGIN_COGNITO_ISSUER=https://cognito-idp.ap-southeast-1.amazonaws.com/<cognito-pool-id>
ORIGIN_COGNITO_CLIENT_ID=<public-cognito-app-client-id>
```

4. Review resource costs and linked branch; execute. If Cognito is not deployed yet, you can omit all three ORIGIN_* variables; the Function will deploy but all file routes remain **disabled** (503) until configured:

```bash
neon deploy --env .env.neon
neon functions get originfiles
neon buckets list
```

5. Take the *real* root HTTPS URL returned by `neon functions get originfiles`, configure it in your Next.js deployment as `NEXT_PUBLIC_ORIGIN_NEON_FILES_URL`, and rebuild Next.js. This is a public function **address**, not a secret. Do not hardcode a made-up endpoint.

## Acceptance tests

- `GET /health` returns `configured:true` when deployment is properly configured.
- Requests to `GET /files` without a valid **access** token (including an ID token) must return 401.
- A signed-in user can upload/list/download a small file, but cannot list or sign another user's key.
- Upload larger than 10 MiB fails. Storage bucket is private.
- The AWS control plane remains unchanged.

**Not implemented:** deletion, pagination after first 30 keys, storage quotas, malware scanning, public-sharing rules, object lifecycle, AWS/Neon automatic synchronization, GitHub import/build execution. Do not release public uploads until these are implemented.

References: https://neon.com/docs/storage/overview and https://neon.com/docs/reference/neon-ts

## Deployed development foundation (2026-10-23)

Neon project `wispy-butterfly-22623578` (Singapore), branch `main` has a private bucket `origin-files` and Function `originfiles`.

Verified Function URL: `https://br-gentle-water-b33tp3hm-originfiles.compute.c-4.ap-southeast-1.aws.neon.tech/`

Verified `GET /health` returns HTTP 200 with `{"service":"origin-files","configured":false}`.
Verified unauthenticated `GET /files` returns HTTP 503 `{"error":"Service not configured"}`. This is intentional: there is no deployed Origin Cognito pool yet. Do not expose uploads or set invalid/mock Cognito values to bypass access control.

The function URL is public metadata, not a secret. The storage credentials pulled by `neon deploy` into `.env.local` are secrets and must remain uncommitted.
