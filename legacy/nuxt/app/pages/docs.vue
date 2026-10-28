<script setup lang="ts">
import { computed, ref } from 'vue'

type Guide = {
  id: string
  title: string
  category: string
  summary: string
  sections: { heading: string, body: string }[]
  command?: string
  action?: { label: string, to: string }
}

const guides: Guide[] = [
  {
    id: 'start',
    title: 'Get started with Origin',
    category: 'Essentials',
    summary: 'The first working flow in the integrated developer workspace.',
    sections: [
      { heading: '1. Import source', body: 'Open Import Repo. Paste a public GitHub repository URL, for example https://github.com/nuxt-ui-templates/starter. Origin reads its default branch and supported text files from the GitHub API.' },
      { heading: '2. Open the workspace', body: 'The file explorer shows the imported files. Select a file to load its content. The source stays read-only on GitHub; edits happen in the browser.' },
      { heading: '3. Keep your work', body: 'Use Save local to persist edits in the current browser, or Download to save the active file to your device. Save local does not commit anything to GitHub.' }
    ],
    action: { label: 'Import a repository', to: '/import' }
  },
  {
    id: 'editor',
    title: 'Editor and local storage',
    category: 'Workspace',
    summary: 'File editing, keyboard shortcuts and data safety.',
    sections: [
      { heading: 'Working files', body: 'The workspace imports supported text files up to 256 KiB each. Binary files, large blobs and some special filenames are intentionally omitted.' },
      { heading: 'Keyboard commands', body: 'Press Ctrl+S or Command+S inside the editor to save locally. Use Tab to insert two spaces. Copy and Download operate on the currently active file.' },
      { heading: 'Browser persistence', body: 'The repository tree and locally saved content use browser local storage, scoped to this browser and origin. Clearing your browser data can erase edits; download important files.' }
    ],
    action: { label: 'Open editor', to: '/workspace' }
  },
  {
    id: 'build',
    title: 'Build and deployment',
    category: 'Operations',
    summary: 'Live AWS build status and operator-authorized frontend releases.',
    sections: [
      { heading: 'Current pipeline', body: 'The Origin Nuxt frontend runs npm ci, npm run typecheck and npm run generate using AWS CodeBuild. Successful output is uploaded to a private S3 bucket and published through CloudFront.' },
      { heading: 'Live build status', body: 'The Build, Dashboard, Overview, Progress and Loading pages read GET /status from the Origin AWS HTTP API. The API reports CodeBuild job status, timestamps and individual phase results, without client-side AWS credentials.' },
      { heading: 'Start build safely', body: 'POST /build requires a signed-in Cognito account that belongs to the origin-operators group. The action can rebuild only the fixed Origin frontend pipeline, not a randomly imported repository. Sign-in is invite-only for this user pool and operator access is assigned by an administrator.' },
      { heading: 'Imported projects', body: 'Arbitrary imported repositories cannot be executed or deployed from this static frontend. A secure, authenticated project-build API and sandbox are still required.' },
      { heading: 'Reproducible local build', body: 'Use the command below inside the 1origin repository. It builds the ui/nuxt frontend, not the arbitrary imported repository.' }
    ],
    command: 'cd ui/nuxt && npm ci && npm run typecheck && npm run generate',
    action: { label: 'Open build details', to: '/build' }
  },
  {
    id: 'theme',
    title: 'One shared design system',
    category: 'Design',
    summary: 'The OKLCH palette and component rules supplied for Origin.',
    sections: [
      { heading: 'Canonical tokens', body: 'All active Origin routes consume ui/nuxt/app/assets/css/origin-theme.css. The palette contains custom-primary 50–950 and custom-neutral 50–950, with a 0.375rem radius and Geist Mono.' },
      { heading: 'Nuxt UI binding', body: 'ui/nuxt/app/app.config.ts maps Nuxt UI semantic primary and neutral to the custom palettes. Component shells share common classes from ui/nuxt/app/assets/css/main.css.' },
      { heading: 'Source template policy', body: 'The eight official Nuxt UI repositories are retained as source references for features integrated into one app. They are not a public template marketplace.' }
    ],
    action: { label: 'Open unified dashboard', to: '/dashboard' }
  },
  {
    id: 'security',
    title: 'Access and security scope',
    category: 'Operations',
    summary: 'What public users can safely do in the current frontend.',
    sections: [
      { heading: 'GitHub access', body: 'Import reads only publicly accessible GitHub API endpoints, without private credentials. GitHub write operations are not enabled.' },
      { heading: 'Cloud access', body: 'Public visitors can read sanitized AWS build status. They cannot start a build without Cognito authentication and operator group membership. Builds run under a fixed, narrowly scoped CodeBuild project.' },
      { heading: 'AI and sessions', body: 'Chat is an on-device notes thread. The AWS Bedrock inference test was denied because the account is still being verified. Origin will not pretend an AI reply has been generated while access is unavailable.' }
    ],
    action: { label: 'Open workspace', to: '/workspace' }
  }
]
const query = ref('')
const selectedId = ref('start')
const copied = ref(false)
const filtered = computed(() => guides.filter(item =>
  (item.title + ' ' + item.category + ' ' + item.summary + ' ' + item.sections.map(section=>section.body).join(' '))
    .toLowerCase().includes(query.value.trim().toLowerCase())))
const selected = computed(() => guides.find(item => item.id === selectedId.value) ?? guides[0]!)
async function copyCommand() {
  if (!selected.value.command) return
  try { await navigator.clipboard.writeText(selected.value.command); copied.value = true }
  catch { copied.value = false }
}
function selectGuide(id: string) { selectedId.value = id; copied.value = false }
</script>

<template>
  <div class="origin-page">
    <div class="eyebrow">KNOWLEDGE / DOCUMENTATION</div>
    <h1 class="page-heading">Docs<span class="origin-accent-text">.</span></h1>
    <p class="page-subtitle">Search the real usage guides for Origin. Every visible route links to an existing function.</p>

    <div class="mt-8 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside class="origin-module-card !p-3 self-start" aria-label="Documentation navigation">
        <label class="block text-[11px] muted mb-2" for="docs-search">Search documentation</label>
        <input id="docs-search" v-model="query" placeholder="Search topics…" class="origin-input" />
        <p class="mono muted text-[10px] mt-2 mb-4">{{ filtered.length }} matching guides</p>
        <div class="flex flex-col gap-1">
          <button v-for="guide in filtered" :key="guide.id"
            class="w-full text-left p-3 rounded-[var(--ui-radius)] hover:bg-[#282828]"
            :aria-pressed="selectedId===guide.id"
            :class="{ 'bg-[#252525] origin-accent-border border': selectedId===guide.id }"
            @click="selectGuide(guide.id)">
            <span class="block font-medium text-[12px]">{{ guide.title }}</span>
            <span class="block muted text-[10px] mt-1">{{ guide.category }}</span>
          </button>
          <p v-if="!filtered.length" class="muted p-3 text-[12px]">No documents match that search.</p>
        </div>
      </aside>

      <article class="origin-module-card !p-6 sm:!p-8 min-h-[430px]">
        <span class="origin-tag mb-4">{{ selected.category }}</span>
        <h2 class="text-[21px] font-semibold tracking-tight">{{ selected.title }}</h2>
        <p class="page-subtitle mt-3">{{ selected.summary }}</p>
        <div class="space-y-7 mt-8">
          <section v-for="section in selected.sections" :key="section.heading">
            <h3 class="font-semibold mb-2">{{ section.heading }}</h3>
            <p class="muted text-[12px] leading-7">{{ section.body }}</p>
          </section>
        </div>
        <div v-if="selected.command" class="flex gap-2 flex-wrap items-center mt-7">
          <code class="origin-code flex-1 text-[11px]">{{ selected.command }}</code>
          <button class="ide-action" @click="copyCommand"><UIcon :name="copied?'i-lucide-check':'i-lucide-copy'" class="size-4"/>{{ copied?'Copied':'Copy command' }}</button>
        </div>
        <NuxtLink v-if="selected.action" :to="selected.action.to" class="ide-primary mt-8">
          {{ selected.action.label }} <UIcon name="i-lucide-arrow-up-right" class="size-4" />
        </NuxtLink>
      </article>
    </div>
  </div>
</template>
