<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

type Task = { id: string, title: string, done: boolean }
const STORAGE = 'origin.personal-progress.v1'
const { state: operationsState, latestBuild, refresh, formatDate } = useOriginOperations()
const original: Task[] = [
  { id:'review', title:'Review the imported source files', done:false },
  { id:'edit', title:'Make and save a local code change', done:false },
  { id:'export', title:'Download the edited file for backup', done:false },
  { id:'docs', title:'Read the project documentation', done:false }
]
const tasks = ref<Task[]>(original.map(item => ({ ...item })))
const ready = ref(false)
const notice = ref('')
const completed = computed(() => tasks.value.filter(task=>task.done).length)
const percentage = computed(() => Math.round((completed.value/tasks.value.length)*100))
onMounted(() => {
  void refresh()
  try {
    const raw = localStorage.getItem(STORAGE)
    if (raw) {
      const saved = JSON.parse(raw)
      if (Array.isArray(saved)) {
        tasks.value = original.map(item => ({
          ...item,
          done: saved.some((task: Task) => task.id===item.id && task.done===true)
        }))
      }
    }
  } catch {
    notice.value = 'Previous checklist could not be restored.'
  }
  ready.value = true
})
watch(tasks, () => {
  if (!ready.value) return
  try {
    localStorage.setItem(STORAGE, JSON.stringify(tasks.value))
    notice.value = 'Checklist saved in this browser.'
  } catch {
    notice.value = 'Browser storage is unavailable. Export your checklist instead.'
  }
}, { deep:true })
function resetTasks() {
  if (!window.confirm('Reset your personal progress checklist?')) return
  tasks.value = original.map(item => ({ ...item }))
}
function exportTasks() {
  if (!import.meta.client) return
  const report = {
    kind:'Origin personal checklist (not AWS build progress)',
    exportedAt:new Date().toISOString(),
    tasks:tasks.value
  }
  const blob = new Blob([JSON.stringify(report,null,2)], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url;link.download='origin-checklist.json';link.click();URL.revokeObjectURL(url)
  notice.value='Checklist exported as JSON.'
}
const verified = [
  { label:'AWS public UI hosting', state:'Verified', note:'S3 + CloudFront; October 24, 2026' },
  { label:'Live AWS build status API', state:'Verified', note:'API Gateway + Lambda reads CodeBuild jobs directly' },
  { label:'Public GitHub repository import', state:'Verified', note:'Browser import of an official Nuxt UI repo succeeded' },
  { label:'Local file save after reload', state:'Verified', note:'Browser E2E confirmed persistence' },
  { label:'Private repositories and Commit/Push', state:'Not enabled', note:'Requires server-side authentication and GitHub App' },
  { label:'Build imported projects on AWS', state:'Not enabled', note:'Requires isolated job API and quotas' },
  { label:'AI assistant response', state:'Not enabled', note:'No production agent messaging backend on this site' }
]
</script>

<template>
  <div class="origin-page">
    <div class="eyebrow">WORKSPACE / DASHBOARD PROGRESS</div>
    <h1 class="page-heading">Progress<span class="origin-accent-text">.</span></h1>
    <p class="page-subtitle">Your editable checklist and a separately labeled snapshot of verified platform capabilities.</p>

    <div class="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section class="origin-module-card">
        <div class="flex items-center justify-between gap-4">
          <div><h2 class="font-semibold text-[14px]">Personal project checklist</h2><p class="muted text-[11px] mt-1">Saved on this device · never treated as cloud job status</p></div>
          <span class="mono origin-accent-text text-[14px]">{{ percentage }}%</span>
        </div>
        <div class="origin-progress-track mt-5 h-2" role="progressbar" aria-label="Personal checklist completion" :aria-valuenow="percentage" aria-valuemin="0" aria-valuemax="100">
          <div class="origin-progress-fill" :style="{width:percentage+'%'}"/>
        </div>
        <p class="mono muted text-[11px] mt-3">{{ completed }} / {{ tasks.length }} complete</p>
        <div class="mt-6 border-t border-[#303030]">
          <label v-for="task in tasks" :key="task.id" class="flex items-start gap-3 border-b border-[#303030] py-4 cursor-pointer">
            <input v-model="task.done" type="checkbox" :aria-label="task.title" class="mt-1 accent-[var(--color-custom-primary-500)] size-4" />
            <span class="text-[12px] leading-6" :class="{ 'line-through muted':task.done }">{{task.title}}</span>
          </label>
        </div>
        <div class="mt-6 flex flex-wrap gap-2">
          <button class="ide-action !p-2.5" @click="exportTasks"><UIcon name="i-lucide-download" class="size-4"/>Export checklist</button>
          <button class="ide-action !p-2.5" @click="resetTasks"><UIcon name="i-lucide-rotate-ccw" class="size-4"/>Reset checklist</button>
        </div>
        <p v-if="notice" role="status" class="muted text-[11px] mt-3">{{ notice }}</p>
      </section>
      <section class="origin-module-card">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div><h2 class="font-semibold text-[14px]">Platform capability snapshot</h2><p class="muted text-[11px] mt-1">Last verified · October 24, 2026</p></div>
          <span class="origin-tag">Read-only facts</span>
        </div>
        <section class="mt-5 border border-[#303030] p-4">
          <div class="flex flex-wrap justify-between items-center gap-3"><h3 class="text-[12px] font-semibold">Actual AWS build progress</h3><button class="ide-action" :disabled="operationsState.loading" @click="refresh(true)"><UIcon name="i-lucide-refresh-cw" class="size-3.5"/>Refresh</button></div>
          <p v-if="operationsState.error" class="ide-notice ide-error mt-3" role="alert">{{operationsState.error}}</p>
          <p class="mono text-[12px] mt-4">{{ latestBuild ? 'Build #'+latestBuild.number+' · '+latestBuild.status : 'No build data available' }}</p>
          <p class="muted text-[11px] mt-2">{{ latestBuild ? formatDate(latestBuild.startedAt) : 'AWS connection not loaded' }}</p>
          <div v-if="latestBuild" class="mt-3 flex flex-wrap gap-2"><span v-for="phase in latestBuild.phases" :key="phase.name" class="origin-tag">{{phase.name}} · {{phase.status || 'Running'}}</span></div>
          <NuxtLink to="/build" class="mt-4 inline-flex text-[11px] origin-accent-text underline">Open AWS build details →</NuxtLink>
        </section>
        <div class="mt-6 space-y-0">
          <div v-for="item in verified" :key="item.label" class="flex gap-3 border-t border-[#303030] py-3">
            <UIcon :name="item.state==='Verified' ? 'i-lucide-check-circle-2' : 'i-lucide-circle-dashed'" class="mt-0.5 size-4 shrink-0" :class="item.state==='Verified' ? 'origin-accent-text' : 'muted'"/>
            <div class="min-w-0 flex-1"><p class="font-medium text-[12px]">{{item.label}}</p><p class="muted text-[11px] leading-5 mt-1">{{item.note}}</p></div>
            <span class="text-[10px] muted shrink-0">{{item.state}}</span>
          </div>
        </div>
        <NuxtLink to="/docs" class="ide-primary inline-flex mt-5">Read activation requirements <UIcon name="i-lucide-arrow-right" class="size-4" /></NuxtLink>
      </section>
    </div>
  </div>
</template>