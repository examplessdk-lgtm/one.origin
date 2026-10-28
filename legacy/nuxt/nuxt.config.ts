export default defineNuxtConfig({
  compatibilityDate: '2026-10-23',
  devtools: { enabled: false },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: { preference: 'dark', fallback: 'dark' },
  app: {
    head: {
      title: 'Origin — Integrated Developer Workspace',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0e0e0e' },
        { name: 'description', content: 'Origin is a unified Nuxt developer workspace with public GitHub repository import, an integrated editor and AWS deployment operations.' }
      ]
    }
  }
})
