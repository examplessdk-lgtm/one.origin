# Cognito callback hydration fix

The user's recording showed the callback page reporting a missing authorization code. A fresh browser reproduced the same error with a non-secret diagnostic `code` and `state` visibly present in the URL. The static Nuxt page mounted before `useRoute().query` reflected the browser location.

The first direct-location patch still ran too early: the installed Nuxt router temporarily replaces even the browser URL with its prerendered path and restores the original query at app:suspense:resolve. The final callback uses onNuxtReady (after restoration) and reads OAuth parameters from window.location.search. This behavior was verified against node_modules/nuxt/dist/pages/runtime/plugins/router.js and app/composables/ready.js. State/PKCE verification, one-time code exchange, Cognito configuration, token storage and access control are unchanged. No real authorization code or token is logged or committed.

Regression tests execute the actual Vue script with an empty router query and temporarily empty browser search, restoring the returned URL only before the Nuxt-ready callback. Before the fix, valid-query and provider-error tests failed; after the fix all callback tests pass. Missing state still prevents token exchange. A real account login is not established by these synthetic tests; the deployed browser must at least advance to PKCE-state verification for a diagnostic URL before declaring the parsing defect fixed.

Release scope: patch the existing production UI through its approved backup-and-publish pipeline, separate fix branch, no merge. Prior production release/source remain available for rollback. No password reset or new user provisioning is required.

## Release evidence

- Fix branch: fix/cognito-callback-hydration, final application commit 16bbf41683bbc2f6313a6ee75aee7fc342662560.
- Local checks: 8 frontend + 16 backend Node tests + 9 Python tests pass (33 total), root lint passes, Nuxt typecheck exits 0 with the existing Vue-router Volar warning.
- GitHub CI 40664480777 succeeded for the final application commit.
- First direct-URL patch 68721b1 was published by build #16 but browser regression still failed; it is superseded by the Nuxt-ready fix. No user-account login success was claimed from that intermediate release.
- Final production build #17: origin-public-ui-build-20261024:0b31d4cc-f9bf-48bf-8f9b-7870576b29c4, SUCCEEDED. Prior files retained at _origin_releases/build-17/ (151 objects). Baseline before the first fix is retained at _origin_releases/build-16/ (147 objects).
- Final CloudFront invalidation: I11KBQKSKZ33R2WGJ0LQGU5YJS. Completed. Live browser regression now advances from the incorrect missing-code error to PKCE-state validation when given the same diagnostic code/state URL. The deliberately invalid fixture correctly remains signed out, and no real user credentials were entered.
- Existing production stack was updated only to pin the new branch/commit; Cognito client settings, passwords, PKCE state validation and IAM were not changed. No merge was performed.

Browser verification after final CDN completion: reloading the exact pre-fix diagnostic URL now reports "Login verification expired" from the existing state verifier, rather than incorrectly reporting that code/state are absent. This proves parsing advances past the original failure; it does not prove a real account sign-in. The normal /preview page was reopened and verified for the user to begin a fresh login.

