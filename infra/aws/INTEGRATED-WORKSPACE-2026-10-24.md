# Origin Integrated Workspace — AWS public deployment, 2026-10-24

## Release intent
The eight Nuxt UI source repositories are ingredients of a SINGLE product, not an end-user catalog. The old design preview dashboard and fictitious project/deployment records are retired from the main navigation. This release enables an initial real browser-local developer workflow.

## Source
- Repository: examplessdk-lgtm/1origin
- Branch: feat/origin-integrated-workspace
- Nuxt root: ui/nuxt
- Shared design: OriginShell + common Geist Mono neutral CSS theme
- Product/source map: docs/NUXT_SOURCE_COMPOSITION.md

## AWS target (previously provisioned)
- Account: 973750561506
- Region: ap-southeast-1 (Singapore)
- Hosting CloudFormation: origin-public-ui-20261024
- CodeBuild CloudFormation: origin-public-ui-codebuild-20261024
- Manual CodeBuild project: origin-public-ui-build-20261024
- CloudFront distribution ID: E1KJQQ9NYCQT2Y
- AWS URL: https://d1x9cuojzyjcbw.cloudfront.net
- Build gate: npm ci, npm run typecheck, npm run generate, assert prerendered routes, upload to private S3 and CloudFront invalidation
- Verified release build: origin-public-ui-build-20261024:675d2ee7-a984-4bfb-9c86-2cc51052b18e — SUCCEEDED in all phases
- AWS CodeBuild project stack was updated to use feat/origin-integrated-workspace as source.
- No Cloudflare DNS changes and no modifications to aibotq.dev or devstack.bid.

## Verified public behaviors
- /workspace — integrated IDE, file explorer, editable text area, copy, download, Save Local.
- /import — public GitHub repo import using REST API; browser E2E imported nuxt-ui-templates/starter, listed 16 text files, opened README.md without CORS errors.
- /overview — shows real browser workspace state: imported repo, 16 text files, and locally saved count.
- /projects — displays current imported repo with Open in IDE route; local removal requires confirmation.
- /build — shows real last verified CodeBuild deployment, correct feature branch and console link; arbitrary repo build intentionally unavailable.
- /loading — actual import busy/idle state; idle confirmed.
- Browser reload test: repository file list and locally saved README content persisted.
- /catalog legacy route: template product gallery retired, redirects/links to integrated IDE.
- /deployments legacy route: example deployment table removed.

## Explicit limitations
- Real GitHub import is PUBLIC, READ-ONLY only. No private GitHub OAuth, commit or push operation.
- Browser edits are LOCAL only, not committed or uploaded to AWS.
- No arbitrary project build from website, no Codex/agent execution, no backend E2E nor production-ready private developer workspace.
- Original Nuxt UI sources for Chat, SaaS, Docs, Landing and Changelog are preserved but not yet integrated as active backend-connected features.
- This is incremental phase 1. Do not describe it as full 8-template feature parity or as a deployed 14-stack AI backend.

## Next feature
Authenticated GitHub import/persistence through Cognito and GitHub App, then an isolated per-project CodeBuild API with build logs and quotas. Each UI button should be enabled only after its real action passes E2E.
