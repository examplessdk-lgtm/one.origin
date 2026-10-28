<script setup lang="ts">
import { computed, onMounted } from 'vue'
const { state, hydrate } = useOriginWorkspace()
const { state: operationsState, latestBuild, refresh } = useOriginOperations()
onMounted(() => { hydrate(); void refresh() })
const saved = computed(() => Object.keys(state.value.savedAt).length)
const rows = computed(() => [
  { label: 'Active repository', value: state.value.repository?.fullName || 'Not connected', note: state.value.repository?.branch || 'Import a public GitHub repository' },
  { label: 'Source files', value: String(state.value.files.length), note: 'Real GitHub tree · supported text files' },
  { label: 'Locally saved', value: String(saved.value), note: 'Stored in your current browser' },
  { label: 'Cloud build', value: latestBuild.value?.status || 'Unavailable', note: 'Live AWS CodeBuild API · ' + (latestBuild.value?.phase || 'No job data') }
])
</script>
<template>
  <div class="origin-page">
    <div class="eyebrow">WORKSPACE / OVERVIEW</div>
    <h1 class="page-heading">Overview<span class="text-white">.</span></h1>
    <p class="page-subtitle">One application, one design system. Workspace values are from your browser; AWS Build status comes directly from the live operations API.</p>
    <section class="metric-band" aria-label="Current workspace state">
      <div v-for="row in rows" :key="row.label" class="metric">
        <p class="metric-label">{{ row.label }}</p>
        <p class="metric-value !text-[16px] break-words">{{ row.value }}</p>
        <p class="metric-note">{{ row.note }}</p>
      </div>
    </section>
    <p v-if="operationsState.error" class="ide-notice ide-error my-3" role="alert">{{operationsState.error}}</p>
    <div class="panel-layout">
      <section>
        <h2 class="section-title mb-4">Get to work</h2>
        <NuxtLink v-for="item in [
          { to:'/workspace', icon:'i-lucide-code-2', title:'Open IDE workspace', detail:'Browse and edit source files' },
          { to:'/import', icon:'i-lucide-folder-input', title:'Import GitHub repository', detail:'Public repository · real read-only fetch' },
          { to:'/build', icon:'i-lucide-hammer', title:'Build pipeline', detail:'Read live CodeBuild status or sign in as operator' },
          { to:'/loading', icon:'i-lucide-activity', title:'Activity and loading', detail:'Live AWS build phases and local file activity' },
          { to:'/dashboard', icon:'i-lucide-blocks', title:'Dashboard', detail:'Real local workspace quick actions' },
          { to:'/docs', icon:'i-lucide-book-open', title:'Documentation', detail:'Search Origin user guides' },
          { to:'/chat', icon:'i-lucide-message-square-text', title:'Chat notes', detail:'Local notes thread (AI not connected)' },
          { to:'/releases', icon:'i-lucide-git-commit-horizontal', title:'Release notes', detail:'Source-grounded change history' }
        ]" :key="item.to" :to="item.to" class="quick-item">
          <span class="flex items-center gap-3"><UIcon :name="item.icon" class="size-4"/><span><span class="block">{{ item.title }}</span><span class="text-[11px] muted">{{ item.detail }}</span></span></span>
          <UIcon name="i-lucide-chevron-right" class="size-4" />
        </NuxtLink>
      </section>
      <aside class="inspector">
        <h2 class="section-title">Environment</h2>
        <div v-for="row in [
          {label:'UI',value:'Nuxt 4 + Nuxt UI'},
          {label:'Hosting',value:'AWS S3 + CloudFront'},
          {label:'Region',value:'Singapore'},
          {label:'Repository',value:'GitHub public import'},
          {label:'Editor',value:'Browser-local'}
        ]" :key="row.label" class="inspector-row">
          <span class="muted">{{ row.label }}</span><span>{{ row.value }}</span>
        </div>
        <p class="source-note mt-6">The live AWS API now reports CodeBuild jobs. Starting a fixed Origin frontend build is protected by Cognito operator access; imported repositories remain read-only.</p>
      </aside>
    </div>
  </div>
</template>