<script setup lang="ts">
import { onMounted } from 'vue'
const { state, hydrate, clearWorkspace } = useOriginWorkspace()
onMounted(hydrate)
function clear() {
  if (window.confirm('Remove the imported repository and all locally saved files from this browser?')) clearWorkspace()
}
</script>
<template>
  <div class="origin-page">
    <div class="eyebrow">WORKSPACE / PROJECTS</div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><h1 class="page-heading">Projects<span class="text-white">.</span></h1>
        <p class="page-subtitle">Repositories you have imported in this browser. No example projects or fake statuses.</p></div>
      <NuxtLink to="/import" class="ide-primary"><UIcon name="i-lucide-folder-input" class="size-4"/>Import repository</NuxtLink>
    </div>
    <div v-if="state.repository" class="mt-8 border-t border-[#343434]">
      <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_130px_120px] items-center border-b border-[#343434] py-5">
        <div><a :href="state.repository.url" target="_blank" rel="noopener noreferrer" class="font-semibold underline underline-offset-4">{{ state.repository.fullName }} ↗</a><p class="mono muted mt-1 text-[11px]">GitHub public · {{ state.repository.branch }}</p></div>
        <span class="mono muted text-[11px]">{{ state.files.length }} text files</span>
        <NuxtLink to="/workspace" class="ide-action !justify-center">Open in IDE</NuxtLink>
      </div>
      <button class="text-[11px] muted hover:text-white underline underline-offset-4 mt-6" @click="clear">Remove this local workspace</button>
    </div>
    <div v-else class="mt-8 border border-[#343434] bg-[#111] px-6 py-10">
      <UIcon name="i-lucide-folder-open" class="size-8 muted" />
      <h2 class="text-[15px] font-semibold mt-4">No imported repository</h2>
      <p class="muted mt-2 text-[12px]">Import a public GitHub project to inspect and edit its source locally.</p>
      <NuxtLink to="/import" class="ide-primary inline-flex mt-5">Import GitHub repository →</NuxtLink>
    </div>
  </div>
</template>