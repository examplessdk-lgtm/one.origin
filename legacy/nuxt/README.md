# Origin — Nuxt UI-first preview

This is a **separate, real Nuxt 4 + Nuxt UI 4 frontend** alongside the existing Next.js application in the repository root. It exists to select and validate the UI/UX **before** wiring cloud systems into these screens.

## Commands

```bash
cd ui/nuxt
npm install
npm run dev
npm run build
```

Designed for desktop and mobile. Sidebar navigation, search (Ctrl/Cmd+K), project filtering, status filters, and a draft-project modal are interactive. All records here are **explicit demo fixtures**, not deployments or user files.

**Do not deploy or migrate the production site yet.** No AWS, Neon, Cognito, Cloudflare, or GitHub write actions are wired into these preview pages. When UI/UX is approved, separately plan the frontend cutover, auth callback migration and backend connections.

Reference library: https://ui.nuxt.com/raw/docs/components.md
Inspiration link: https://codesandbox.io/p/devbox/nuxt-ui-xgrzw5 (sandbox was access-restricted during inspection, so no visual fidelity claim)
