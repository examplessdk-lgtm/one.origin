<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
const { state, hydrate } = useOriginWorkspace()
const { state: operationsState, latestBuild, activeBuild, refresh, formatDate } = useOriginOperations()
onMounted(() => { hydrate(); void refresh() })

const localSaves = computed(() => Object.entries(state.value.savedAt)
  .map(([path, at]) => ({ path, at }))
  .sort((a, b) => b.at - a.at)
  .slice(0, 8))
const notice = ref('')

async function copyRepo() {
  if (!state.value.repository) return
  try {
    await navigator.clipboard.writeText(state.value.repository.url)
    notice.value = 'Repository URL copied to clipboard.'
  } catch {
    notice.value = 'Unable to copy. Open Projects to access the repository link.'
  }
}
function downloadManifest() {
  if (!state.value.repository || !import.meta.client) return
  const data = {
    repository: state.value.repository.fullName,
    branch: state.value.repository.branch,
    source: state.value.repository.url,
    exportedAt: new Date().toISOString(),
    files: state.value.files.map(file => file.path)
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = state.value.repository.name + '-origin-manifest.json'
  anchor.click()
  URL.revokeObjectURL(objectUrl)
  notice.value = 'Project file manifest exported to your device. Source code was not included.'
}
const actions = [
  { to:'/workspace', title:'Workspace', detail:'Browse and edit local source', icon:'i-lucide-code-2' },
  { to:'/import', title:'Import Repo', detail:'Load public GitHub files', icon:'i-lucide-folder-input' },
  { to:'/progress', title:'Project Progress', detail:'Your editable task checklist', icon:'i-lucide-list-checks' },
  { to:'/build', title:'Build', detail:'Live AWS CodeBuild results and operator controls', icon:'i-lucide-hammer' },
  { to:'/docs', title:'Documentation', detail:'Guides and security scope', icon:'i-lucide-book-open-text' },
  { to:'/releases', title:'Release Notes', detail:'Verified platform changes', icon:'i-lucide-git-commit-horizontal' }
]
</script>
<template>
  <div class="origin-page">
    <div class="eyebrow">ORIGIN / APPLICATION</div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="page-heading">Dashboard<span class="origin-accent-text">.</span></h1>
        <p class="page-subtitle">Real workspace controls, recent local saves, and the operations that are actually available.</p>
      </div>
      <span class="origin-tag">SaaS shell · local workspace</span>
    </div>
    <div class="metric-band">
      <div class="metric"><div class="metric-label">Repository</div><div class="metric-value !text-[14px] break-words">{{ state.repository?.fullName || 'Not imported' }}</div><div class="metric-note">{{ state.repository?.branch || 'Public GitHub' }}</div></div>
      <div class="metric"><div class="metric-label">Browsable source files</div><div class="metric-value">{{ state.files.length }}</div><div class="metric-note">Text files only</div></div>
      <div class="metric"><div class="metric-label">Local saves</div><div class="metric-value">{{ Object.keys(state.savedAt).length }}</div><div class="metric-note">This browser</div></div>
      <div class="metric"><div class="metric-label">AWS Build status</div><div class="metric-value !text-[16px]">{{ latestBuild?.status || (operationsState.loading ? 'Connecting…':'Unavailable') }}</div><div class="metric-note">Live CodeBuild API</div></div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(240px,1fr)]">
      <section>
        <h2 class="section-title mb-4">Open a feature</h2>
        <div class="grid sm:grid-cols-2 gap-3">
          <NuxtLink v-for="action in actions" :key="action.to" :to="action.to" class="origin-module-card group no-underline text-inherit">
            <div class="flex items-center justify-between">
              <UIcon :name="action.icon" class="size-5 origin-accent-text" />
              <UIcon name="i-lucide-arrow-up-right" class="size-4 muted" />
            </div>
            <h3 class="font-semibold text-[13px] mt-4">{{ action.title }}</h3>
            <p class="muted text-[11px] leading-5 mt-1">{{ action.detail }}</p>
          </NuxtLink>
        </div>
        <section class="origin-module-card mt-5">
          <div class="flex flex-wrap justify-between items-start gap-4">
            <div><h2 class="section-title">Live AWS operations</h2><p class="muted text-[11px] mt-2">Read-only project history from the deployed API, never sample values.</p></div>
            <button class="ide-action" :disabled="operationsState.loading" @click="refresh(true)">
              <UIcon name="i-lucide-refresh-cw" class="size-4" :class="{'animate-spin':operationsState.loading}"/>Refresh
            </button>
          </div>
          <p v-if="operationsState.error" class="ide-notice ide-error mt-3" role="alert">{{ operationsState.error }}</p>
          <div v-if="latestBuild" class="mt-5 border-t border-[#303030] pt-4">
            <p class="mono text-[12px]">Build #{{ latestBuild.number }} · {{latestBuild.status}}</p>
            <p class="mono muted text-[10px] mt-2">{{ formatDate(latestBuild.startedAt) }} · {{ latestBuild.phase || 'Completed' }}</p>
            <p v-if="activeBuild" class="origin-accent-text text-[11px] mt-2">AWS job running · See Build for actual phases</p>
          </div>
          <p v-else class="muted text-[11px] mt-4">No AWS build returned yet.</p>
          <NuxtLink to="/build" class="ide-action !px-4 !py-2.5 mt-4">Open AWS Build history <UIcon name="i-lucide-arrow-up-right" class="size-4"/></NuxtLink>
        </section>
        <section v-if="state.repository" class="origin-module-card mt-5">
          <h2 class="section-title">Repository utilities</h2>
          <p class="muted text-[11px] mt-2 mb-4">These actions operate on current public repository metadata, not GitHub write permissions.</p>
          <div class="flex flex-wrap gap-2">
            <button class="ide-action !p-2.5" @click="copyRepo"><UIcon name="i-lucide-copy" class="size-4" />Copy repository URL</button>
            <button class="ide-action !p-2.5" @click="downloadManifest"><UIcon name="i-lucide-download" class="size-4" />Export file manifest</button>
          </div>
          <p v-if="notice" class="mt-3 muted text-[11px]" role="status">{{ notice }}</p>
        </section>
      </section>
      <aside class="space-y-5">
        <section class="origin-module-card">
          <h2 class="section-title">Recently saved in this browser</h2>
          <div v-if="localSaves.length" class="mt-4">
            <div v-for="entry in localSaves" :key="entry.path" class="border-t border-[#303030] py-3">
              <p class="text-[11px] font-medium break-all">{{ entry.path }}</p>
              <p class="mono muted text-[10px] mt-1">{{ new Date(entry.at).toLocaleString() }}</p>
            </div>
          </div>
          <p v-else class="muted text-[12px] leading-6 mt-4">No local saves yet. Import a repository and use Save local in the editor.</p>
        </section>
        <section class="origin-module-card">
          <h2 class="section-title">Cloud backend boundary</h2>
          <p class="muted text-[12px] leading-6 mt-3">The frontend now reads live AWS CodeBuild status through API Gateway. Starting a fixed frontend build requires Cognito operator access. Private GitHub writes, arbitrary project builds and AI inference are still unavailable.</p>
          <NuxtLink to="/docs" class="mt-4 inline-flex items-center gap-2 text-[11px] origin-accent-text underline underline-offset-4">Read security scope <UIcon name="i-lucide-arrow-up-right" class="size-3"/></NuxtLink>
        </section>
      </aside>
    </div>
  </div>
</template>
