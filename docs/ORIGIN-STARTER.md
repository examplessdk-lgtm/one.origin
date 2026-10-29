# Origin Starter deployment entry

The homepage Get started button opens `/hosting?template=origin-starter`. The repository `examplessdk-lgtm/OriginStarter-Template` and branch `main` are read-only. OAuth return state retains this URL. Project creation persists the source on the backend, and subsequent builds resolve that source to an immutable commit. Existing projects keep their original repository and build path.

## Prepared changes

- Starter source: sibling checkout `OriginStarter-Template`, dependency-free Node 22 static build.
- Backend: explicit allowlist of the existing repository and starter; starter projects require `main`.
- CodeBuild: chooses root for starter or `ui/nuxt` for legacy projects; both output `.output/public` into a common artifact directory.
- GitHub broker default allowlist includes the starter. Updating a default does not override an existing CloudFormation parameter value.

## Release steps (not executed)

1. Review and push starter files to `examplessdk-lgtm/OriginStarter-Template/main` first. The remote repository had only LICENSE during inspection.
2. Ensure the existing GitHub App installation includes the starter and the repository is public, as required by the existing preview service.
3. Review and apply backend/CodeBuild infrastructure updates. Explicitly set broker parameter `AllowedRepositories` to `examplessdk-lgtm/1origin,examplessdk-lgtm/OriginStarter-Template` on the existing stack.
4. Review and publish the updated `one.origin` frontend through its current deployment pipeline.
5. Verify Get started → locked source → sign-in → named project → build → review preview → explicit publish. Check an existing project's build still uses its original source.

## Existing constraints

This change preserves the operator membership requirement. It does not enable deployment for all registered users. Frontend AWS operations are currently enabled only on `https://os.1origin.dev`. The checked-in runtime points to `ap-southeast-1`; it has not been verified against or migrated to the Lambda ARN supplied in the chat (`ap-southeast-2`, account `302761015570`). Do not apply these stack templates to that account merely because its ARN was mentioned.

## Local verification

- Application lint and production build passed; build reports a CSS sourcemap warning.
- 47 tests passed, including starter branch locking, source persistence and build selection.
- Starter build and preview base-path substitution passed.
- No live GitHub import, paid CodeBuild, OAuth or public deployment was executed.
