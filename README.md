# create-oneorigin-app

**Start an ONEORIGIN website, Worker API, or AI agent project on Cloudflare Workers.**

[`create-oneorigin-app`](https://www.npmjs.com/package/create-oneorigin-app) is a command-line project generator. It creates application files, Wrangler configuration, and npm scripts for local development, deployment validation, and publishing to your Cloudflare account.

[npm package](https://www.npmjs.com/package/create-oneorigin-app) · [Application source](https://github.com/examplessdk-lgtm/one.origin) · [Technical documentation](docs/MIGRATION.md)

## Quick start

Install Node.js 20 or newer and npm, then create a project:

```sh
npx create-oneorigin-app@latest my-site
cd my-site
npm install
npm run dev
```

Open the local URL printed by Wrangler. The default template includes the ONEORIGIN site build, JavaScript and CSS assets, and a `wrangler.toml` configured with single-page application fallback.

Generation runs without interactive prompts. It creates files only; dependency installation and deployment are separate steps. Choose a new directory name containing lowercase letters, digits, and dashes, starting with a letter or digit. Existing directories are rejected rather than overwritten.

To validate and publish the generated project:

```sh
npm run check
npx wrangler login
npm run deploy
```

`check` runs `wrangler deploy --dry-run`: it validates and packages the project without publishing. Deployment requires a Cloudflare account with the appropriate permissions.

## Templates

| Template | Purpose | Generated application |
| --- | --- | --- |
| `oneorigin` | Launch the ONEORIGIN starter website | Prebuilt site in `public/`, bundled assets, and SPA fallback |
| `worker` | Build an API alongside static content | Editable `src/index.js`, static files, and `/api/health` |
| `agent` | Connect a Worker to an AI provider | Editable Worker source, static files, `/api/health`, and `POST /api/agent/message` |

```sh
# ONEORIGIN website — default
npx create-oneorigin-app@latest my-site

# Static content and a JSON API
npx create-oneorigin-app@latest my-api --template worker

# Agent backed by OpenAI
npx create-oneorigin-app@latest my-agent --template agent --provider openai

# Agent backed by Base44
npx create-oneorigin-app@latest my-base44-agent --template agent --provider base44
```

The website template distributes a compiled site, rather than editable React or TanStack source. To develop the existing ONEORIGIN application interface, use the repository workflow below.

### Command-line options

```sh
npx create-oneorigin-app@latest <project-name> [options]
```

| Option | Default | Description |
| --- | --- | --- |
| `--template <name>` | `oneorigin` | Select `oneorigin`, `worker`, or `agent` |
| `--provider <name>` | `openai` | Select `openai` or `base44` for the agent template |
| `--yes`, `-y` | Disabled | Allow invocation without a project name; uses `oneorigin-site` |
| `--help`, `-h` | — | Display usage information |

For a reproducible generator version, replace `@latest` with a published version, for example `create-oneorigin-app@1.0.0`.

## Generated project

| Path or command | Role |
| --- | --- |
| `package.json` | Project metadata and development scripts |
| `wrangler.toml` | Worker name, compatibility date, static assets, and template settings |
| `public/index.html` | Website entry point |
| `public/assets/` | Compiled website assets in the `oneorigin` template |
| `src/index.js` | Request handler in the `worker` and `agent` templates |
| `README.md` | Instructions for the selected template |
| `npm run dev` | Run locally with Wrangler |
| `npm run check` | Perform a deployment dry run |
| `npm run deploy` | Publish to Cloudflare Workers |

### Configure an agent

The agent template needs provider credentials and access to the API used by its generated handler. Scaffolding does not provision an AI account or confirm a successful provider request.

For local development, create a `.dev.vars` file in the generated project with the variables required by your provider. Keep this file out of version control.

| Provider | Required variables | Additional configuration |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | Review `AGENT_MODEL` in `wrangler.toml`; `AGENT_INSTRUCTIONS` can override the handler's instructions |
| Base44 | `BASE44_API_KEY`, `BASE44_AGENT_ID` | Use an agent accessible to the configured key |

Store production credentials with Wrangler from the generated project directory. Run only the commands for your selected provider:

```sh
# OpenAI
npx wrangler secret put OPENAI_API_KEY

# Base44
npx wrangler secret put BASE44_API_KEY
npx wrangler secret put BASE44_AGENT_ID
```

After starting the local development server, send a message to its printed URL:

```sh
curl http://localhost:8787/api/agent/message \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello, ONEORIGIN"}'
```

Replace the port if Wrangler selects a different one. A successful response includes `ok` and `reply`. The Base44 handler also returns `conversation_id`, which can be included with the next message to continue a conversation. `/api/health` reports handler configuration and identity; it does not test provider connectivity.

The generated agent handler does not include caller authentication, rate limiting, or a usage quota. Add those controls before exposing an endpoint that spends provider credits to public traffic.

## Develop the ONEORIGIN application

This repository contains the existing ONEORIGIN application and infrastructure sources. Its root package is a private application named `one-origin`, not the published CLI. The CLI implementation is not included in this repository at this revision; changes here do not automatically update the npm package or its package-page README.

The application uses React 19, TanStack Start, Base44 integration, and Cloudflare Workers for server-side rendering. AWS services support the existing operator hosting workflow. The npm-generated static website is a separate distribution with a different development and deployment workflow.

### Local setup

For this repository, use Node.js 22.12+ or 24:

```sh
git clone https://github.com/examplessdk-lgtm/one.origin.git
cd one.origin
npm ci --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Review `.env.local` before enabling integrations. Set `VITE_ORIGIN_ENABLED=false` when developing without the existing AWS operator environment. The application also restricts AWS operations to the exact `https://os.1origin.dev` origin.

For Base44-backed account and data features, use an authenticated Base44 CLI linked to the existing app:

```sh
base44 login
base44 link
base44 dev
```

Use the existing app identified in `.env.example`. See [Base44 setup](docs/BASE44_ORIGINAL.md) for the original integration context. `VITE_*` variables are public browser configuration and must not contain secrets.

### Repository structure

| Directory | Responsibility |
| --- | --- |
| `src/` | React interface, TanStack routes, server functions, and shared UI |
| `src/routes/hosting.jsx` | Project, build, log, and production-release interface |
| `src/lib/origin/` | AWS API client and Cognito authentication integration |
| `backend/` | GitHub App broker, preview services, control plane, and backend tests |
| `infra/aws/`, `infrastructure/` | CloudFormation templates and infrastructure sources |
| `scripts/` | Infrastructure generation and verification utilities |
| `base44/entities/` | Base44 entity schemas |
| `legacy/nuxt/` | Archived Nuxt frontend and earlier integration reference |
| `docs/` | Architecture, migration, operational limits, and release evidence |

### Validate application changes

```sh
npm run lint
npm test
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
npm run build
```

The Python backend tests require the dependencies in `backend/requirements.txt`. The application build produces `dist/client` and `dist/server` for TanStack SSR on Cloudflare Workers. Uploading only client files to static hosting does not deploy the complete application.

### Integration scope

The documented hosting release is an operator workspace with persistent projects, pinned preview builds, logs, and production publication through the existing AWS backend. Its supported build source is currently limited to `examplessdk-lgtm/1origin` and that repository's `ui/nuxt` static application. It does not provide general-purpose hosting for arbitrary repositories or SSR applications.

Base44 application accounts and Cognito operator sessions remain separate. The application's Agent page and early-access form include demo behavior; installing the CLI or cloning this repository does not connect those features to a live AI service or mailing system.

## Documentation and support

| Resource | Contents |
| --- | --- |
| [npm package](https://www.npmjs.com/package/create-oneorigin-app) | Published generator, versions, and package metadata |
| [Projects and production](docs/PROJECTS-PRODUCTION.md) | Hosting workflow, API routes, supported sources, and release evidence |
| [Migration guide](docs/MIGRATION.md) | Application architecture and integration boundaries |
| [Agent readiness](docs/AGENT-READINESS.md) | Public HTML, Markdown, discovery files, and verification |
| [Legacy Nuxt frontend](legacy/nuxt/README.md) | Archived frontend setup |
| [GitHub issues](https://github.com/examplessdk-lgtm/one.origin/issues) | Application or documentation issue reports |

Include the package version, Node.js version, template, command, and relevant error output when reporting an issue. Remove credentials from logs.

The published `create-oneorigin-app` package declares the MIT license. That package declaration does not establish a license for every application, archived file, or third-party asset in this repository.
