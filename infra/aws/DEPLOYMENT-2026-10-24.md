# AWS Public UI Deployment — 2026-10-24

**Scope:** Public *static Nuxt UI preview only*. This is **not** a completed 14-stack AI Agent system and does not serve the Next.js application, agent execution, authenticated APIs or SSR.

## Public URL
https://d1x9cuojzyjcbw.cloudfront.net/
https://d1x9cuojzyjcbw.cloudfront.net/catalog
https://d1x9cuojzyjcbw.cloudfront.net/loading

## AWS resources (Singapore account)
- Frontend CloudFormation stack: `origin-public-ui-20261024` (CREATE_COMPLETE, subsequently UPDATE_COMPLETE for pretty URL routing)
- Private S3 bucket: `origin-public-ui-20261024-staticbucket-cegkn49rtyzn`
- CloudFront distribution: `E1KJQQ9NYCQT2Y`
- CloudFront origin access control: `E33AXTX1HB2R3B`
- CloudFront Function: `origin-ui-pretty-url-20261024` (viewer-request, routes clean paths to the corresponding prerendered HTML)
- CodeBuild CloudFormation stack: `origin-public-ui-codebuild-20261024`
- CodeBuild project: `origin-public-ui-build-20261024`

## Source and build
- Source repository: `examplessdk-lgtm/1origin`
- Source branch: `feat/nuxt-ui-first`
- Nuxt workspace: `ui/nuxt`
- Pipeline: CodeBuild Node 22 => `npm ci` => `npm run generate` => `aws s3 sync .output/public s3://BUCKET --delete` => CloudFront invalidation
- Build ID: `origin-public-ui-build-20261024:739dcb0b-4440-44da-8a39-38987dc65968`
- Build status: SUCCEEDED, all build phases passed; 81 static files uploaded.
- CodeBuild builds are **manual**; there is NO GitHub auto-deploy trigger.

## Controls and limitations
- Private S3 bucket: Block Public Access enabled, signed CloudFront OAC access only.
- CloudFront serves public static UI; no backend secrets or authenticated API are intentionally hosted here.
- Static preview data is demo data; Catalog includes all 13 template references but does not execute or host each template as an independent application.
- Cognito `1origin-users` remains unchanged.
- Existing `1origin.dev`, `aibotq.dev` and `devstack.bid` DNS and runtime remain untouched.
- Original AWS CDK 14-stack scaffold is **not deployed**: API, WAF, Aurora, OpenSearch, ECS, Bedrock, Lambda, Step Functions and SSR need additional validated implementation.
- CloudFormation is currently the source of truth for the two real AWS stacks. Export their templates from AWS before managing them with CDK, to prevent infrastructure duplication.
- Budget thresholds are alerts/controls, **not guaranteed hard caps** on AWS costs.

## Smoke tests
- HTTPS homepage: HTTP 200
- HTTPS `/catalog`: HTTP 200, actual Catalog HTML
- Browser Catalog filters: All 13, Vue 3, Nuxt 10; client-side hydration working
- Verify remaining routes after CloudFront Function rollout.

## Next implementation stage
Port or import deployed CloudFormation resources into the CDK IaC without replacing live resources; then implement isolated verified AWS service APIs, identity and real agent workers separately. Do not repoint DNS until production route and authentication testing.
