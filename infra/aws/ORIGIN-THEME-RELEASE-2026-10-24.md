# Origin shared OKLCH theme and active modules — Public release

Date: 2026-10-24 (Asia/Bangkok)
Source repository: examplessdk-lgtm/1origin
Release branch: feat/origin-theme-sections-20261024
Target: AWS Singapore, same existing private S3 + CloudFront public frontend

## Deployment confirmation
- CodeBuild project: origin-public-ui-build-20261024
- Successful production release build: origin-public-ui-build-20261024:76a4b789-c46b-4294-95ce-a84ed60bd2fc
- CodeBuild status: SUCCEEDED in every phase (including TypeScript, static generation, S3 sync and CloudFront invalidation)
- Hosting CloudFormation: origin-public-ui-20261024 — UPDATE_COMPLETE
- Pipeline CloudFormation: origin-public-ui-codebuild-20261024 — UPDATE_COMPLETE
- CloudFront: E1KJQQ9NYCQT2Y — Deployed and enabled
- Public URL: https://d1x9cuojzyjcbw.cloudfront.net/
- Private S3 object count at verification: 95; individual HTML files verified for workspace, dashboard, docs, chat, progress, releases and loading.

## Shared theme implementation
- Canonical active tokens: ui/nuxt/app/assets/css/origin-theme.css
- Import once from ui/nuxt/app/assets/css/main.css
- Nuxt UI app.config maps primary and neutral to custom-primary and custom-neutral.
- User-provided OKLCH palette for both 50–950 color scales, Geist Mono and 0.375rem radius.
- Browser computed style verification: --ui-radius=0.375rem; --color-custom-primary-500=oklch(71.6% .152 252.388); --ui-color-primary-500 matches; --ui-primary dark mode=oklch(45.3% .105 240.631).
- The original upstream template repository snapshots remain preserved; active routes share the new palette without duplicating CSS.

## Working routes and browser E2E
- /dashboard: six route cards, actual imported GitHub repo/file metrics; Copy repository URL worked after importing nuxt-ui-templates/starter (16 text files).
- /docs: five operational guides; searched "build", opened Build and deployment and clicked Copy command, saw "Copied".
- /progress: four personal checklist entries; checked first task (25%), hard reload persisted; Reset confirmation restored 0%.
- /chat: saved test note, hard reload persisted, deleted test note; no simulated AI response.
- /releases: Infrastructure filter reduced three verified release entries to one, All restored three.
- /loading: existing real browser import busy/idle status; no simulated cloud build progress.
- Mobile: drawer opened, Workspace/Operations/Knowledge sections appeared; navigated to Docs and Release Notes; no clipped or obscured controls observed in smoke test.

## Limits and release rules
- Chat currently operates as local browser notes, NOT an AI agent. No private GitHub, commit/push, build arbitrary imported repositories or authenticated SaaS operations.
- Progress is a *personal checklist* stored in browser localStorage, not AWS job progress.
- Docs and release notes are curated static content, not live CMS or activity stream.
- No Cloudflare DNS, aibotq.dev or devstack.bid change.
- All 14 AWS CDK backend stacks are a separate incomplete implementation; this release does not deploy that backend.
- Source theme link from the user is the design reference; the exact OKLCH values were applied as CSS tokens.
