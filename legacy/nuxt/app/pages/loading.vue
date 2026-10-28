<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'

const { state, hydrate } = useOriginWorkspace()
const { state: operationsState, latestBuild, activeBuild, refresh, formatDate } = useOriginOperations()
const localCurrent = computed(() => state.value.busy ? 'Reading source files from GitHub' : 'No local import in progress')
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  hydrate()
  void refresh(true)
  timer = setInterval(() => { void refresh() }, 15000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="origin-page max-w-[1050px]">
    <div class="eyebrow">OPERATIONS / LIVE ACTIVITY</div>
    <h1 class="page-heading">Loading &amp; activity<span class="origin-accent-text">.</span></h1>
    <p class="page-subtitle">Current browser import state and live AWS CodeBuild job phases. Nothing here is simulated.</p>
    <div class="grid gap-5 mt-8">
      <section class="origin-module-card !p-7">
        <div class="flex items-start gap-4">
          <UIcon :name="state.busy ? 'i-lucide-loader-circle' : 'i-lucide-folder-check'"
            class="size-6 origin-accent-text" :class="{'animate-spin': state.busy}" />
          <div class="flex-1 min-w-0">
            <h2 class="text-[16px] font-semibold">GitHub file operations</h2>
            <p class="muted text-[12px] leading-6 mt-2">{{ localCurrent }}</p>
            <p class="mono muted text-[11px] mt-3 break-all">{{ state.repository?.fullName || 'No GitHub repository imported in this browser' }}</p>
          </div>
        </div>
        <p v-if="state.error" role="alert" class="ide-notice ide-error mt-6">{{state.error}}</p>
        <p v-if="state.notice" role="status" class="ide-notice mt-6">{{state.notice}}</p>
        <p class="mono muted text-[11px] mt-5">{{state.files.length}} available text files · {{Object.keys(state.savedAt).length}} local saves</p>
      </section>

      <section class="origin-module-card !p-7">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex gap-4">
            <UIcon :name="activeBuild ? 'i-lucide-loader-circle':'i-lucide-server'" class="size-6 origin-accent-text" :class="{'animate-spin':!!activeBuild}"/>
            <div>
              <h2 class="text-[16px] font-semibold">AWS CodeBuild</h2>
              <p class="muted text-[12px] leading-6 mt-2">
                {{ activeBuild ? 'Running AWS build #' + activeBuild.number : latestBuild ? 'Latest AWS job: ' + latestBuild.status : operationsState.loading ? 'Connecting to AWS…' : 'No AWS job found' }}
              </p>
              <p class="mono muted text-[10px] mt-1">{{operationsState.status?.project || 'Origin operations API'}}</p>
            </div>
          </div>
          <button class="ide-action" :disabled="operationsState.loading" @click="refresh(true)"><UIcon name="i-lucide-refresh-cw" class="size-4" :class="{'animate-spin':operationsState.loading}"/>Refresh</button>
        </div>
        <p v-if="operationsState.error" class="ide-notice ide-error mt-5" role="alert">{{operationsState.error}}</p>
        <div v-if="latestBuild" class="mt-6 border-t border-[#303030] pt-5">
          <p class="mono text-[11px]">Build #{{latestBuild.number}} · {{latestBuild.status}}</p>
          <p class="muted text-[11px] mt-1">Started {{formatDate(latestBuild.startedAt)}} · Current phase {{latestBuild.phase || 'Completed'}}</p>
          <div class="flex flex-wrap gap-2 mt-4">
            <span v-for="phase in latestBuild.phases" :key="phase.name" class="origin-tag">{{phase.name}} · {{phase.status || 'In progress'}}</span>
          </div>
        </div>
        <p class="mono muted text-[10px] mt-5">Last AWS response: {{formatDate(operationsState.status?.fetchedAt)}} · automatically refreshes every 15 seconds</p>
      </section>
    </div>

    <div class="mt-8 flex flex-wrap gap-3">
      <NuxtLink to="/workspace" class="ide-primary">Open workspace</NuxtLink>
      <NuxtLink to="/import" class="ide-action !px-4 !py-2.5">Import repository</NuxtLink>
      <NuxtLink to="/build" class="ide-action !px-4 !py-2.5">Build history and controls</NuxtLink>
    </div>
  </div>
</template>