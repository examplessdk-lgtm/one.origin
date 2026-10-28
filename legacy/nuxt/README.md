# ONEORIGIN — Legacy Nuxt Frontend

This directory preserves the earlier ONEORIGIN frontend built with Nuxt 4, Nuxt UI 4, Vue 3, and Tailwind CSS 4. It remains an implementation reference for the interface, Cognito callback handling, and AWS workspace integration.

The current application lives at the repository root and uses React 19 with TanStack Start. For a new Cloudflare project, use [`create-oneorigin-app` on npm](https://www.npmjs.com/package/create-oneorigin-app). This archived Nuxt frontend is not a template distributed by that CLI.

## Start a new project

```sh
npx create-oneorigin-app@latest my-site
cd my-site
npm install
npm run dev
```

See the [main README](../../README.md) for the `oneorigin`, `worker`, and `agent` templates, provider configuration, and deployment commands.

## Run the archived frontend

From the repository root:

```sh
cd legacy/nuxt
npm install
npm run dev
```

Open the local URL printed by Nuxt. These commands run the archived source; they do not start the current TanStack application or an npm-generated project.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Nuxt development server |
| `npm run build` | Build the Nuxt application |
| `npm run generate` | Generate static output |
| `npm run typecheck` | Run Nuxt's type checks |

## Source and integration boundaries

| Path | Responsibility |
| --- | --- |
| `app/components/OriginShell.vue` | Shared navigation and workspace shell |
| `app/assets/css/` | Styling and theme reference |
| `app/composables/useOriginAuth.ts` | Earlier Cognito authentication integration |
| `app/composables/useOriginOperations.ts` | Earlier AWS operations integration |
| `app/composables/useOriginWorkspace.ts` | Workspace state and repository interactions |
| `app/data/demo.ts` | Explicit UI fixture records |

Fixture records are not evidence of live deployments or user data. This archive also contains integration code, so its screens should not all be described as disconnected mockups. Running it locally does not provision cloud resources, migrate accounts, or switch the production frontend.

The existing AWS builder's documented source path is `ui/nuxt` in `examplessdk-lgtm/1origin`. That is a different repository and path from this archive; see [Projects and production](../../docs/PROJECTS-PRODUCTION.md) before changing build configuration.

## Related documentation

- [Current application and npm quick start](../../README.md)
- [Migration guide](../../docs/MIGRATION.md)
- [Original Nuxt composition notes](../../docs/legacy/NUXT_SOURCE_COMPOSITION.md)
- [Nuxt UI component reference](https://ui.nuxt.com/)
