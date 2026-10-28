<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const copied = ref(false)
const command = 'cd ui/nuxt && npm ci && npm run typecheck && npm run generate'
const operations = useOriginOperations()
const { state: operationsState, logsState, latestBuild, activeBuild, refresh, startBuild, loadLogs, formatDate } = operations
const auth = useOriginAuth()
const { state: authState, isSignedIn, canStartBuild } = auth

let polling: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  auth.hydrate()
  void refresh(true)
  polling = setInterval(() => { void refresh() }, 15000)
})
onBeforeUnmount(() => { if (polling) clearInterval(polling) })

async function copyCommand() {
  try { await navigator.clipboard.writeText(command); copied.value = true }
  catch { copied.value = false }
}

async function viewLogs(buildId: string) {
  if (!canStartBuild.value || !authState.value.session?.accessToken) return
  await loadLogs(authState.value.session.accessToken, buildId)
}

async function requestBuild() {
  if (!isSignedIn.value) {
    await auth.signIn('/build')
    return
  }
  if (!canStartBuild.value) {
    operationsState.value.error = 'This account does not have Origin operator access. Contact your administrator.'
    return
  }
  const yes = window.confirm('Start a REAL AWS CodeBuild run for the fixed Origin frontend? This uses paid AWS resources and may update the public CloudFront site.')
  if (!yes) return
  await startBuild(authState.value.session?.accessToken || '')
}

const readableStatus = (status?: string) => {
  if (status === 'SUCCEEDED') return 'SUCCEEDED'
  if (status === 'FAILED') return 'FAILED'
  if (status === 'IN_PROGRESS') return 'RUNNING'
  return status || 'NOT AVAILABLE'
}
</script>

<template>
  <div class="origin-page">
    <NuxtLink to="/preview" class="ide-primary mb-5 inline-flex">สร้างเว็บทดลองจาก GitHub →</NuxtLink>
    <div class="eyebrow">OPERATIONS / AWS CODEBUILD</div>
    <h1 class="page-heading">Build<span class="origin-accent-text">.</span></h1>
    <p class="page-subtitle">Live AWS CodeBuild history from the Origin operations API. No simulated progress or job records.</p>

    <div class="origin-module-card mt-8 max-w-[1000px] !p-0">
      <div class="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-[#303030]">
        <div>
          <h2 class="font-semibold text-[14px]">Origin Nuxt frontend</h2>
          <p class="mono muted text-[11px] mt-1">{{ operationsState.status?.project || 'Connecting to AWS…' }}</p>
        </div>
        <span class="origin-tag" :aria-label="'Latest build ' + readableStatus(latestBuild?.status)">
          <UIcon :name="activeBuild ? 'i-lucide-loader-circle' : 'i-lucide-activity'" class="size-3.5"
            :class="{'animate-spin':!!activeBuild}" />
          {{ operationsState.loading && !operationsState.status ? 'CONNECTING' : readableStatus(latestBuild?.status) }}
        </span>
      </div>

      <div v-if="operationsState.error" class="ide-notice ide-error" role="alert">{{operationsState.error}}</div>
      <div v-if="operationsState.notice" class="ide-notice" role="status">{{ operationsState.notice }}</div>

      <dl class="grid sm:grid-cols-2 gap-5 p-5 text-[12px]">
        <div><dt class="mono muted text-[10px] mb-1">Source</dt><dd>{{operationsState.status?.source || 'Not connected'}}</dd></div>
        <div><dt class="mono muted text-[10px] mb-1">AWS project</dt><dd class="break-all">{{ operationsState.status?.project || '—' }}</dd></div>
        <div><dt class="mono muted text-[10px] mb-1">Last job started</dt><dd>{{ formatDate(latestBuild?.startedAt) }}</dd></div>
        <div><dt class="mono muted text-[10px] mb-1">Status read at</dt><dd>{{ formatDate(operationsState.status?.fetchedAt) }}</dd></div>
      </dl>

      <div class="p-5 border-t border-[#303030] flex gap-3 flex-wrap items-center">
        <button class="ide-action !px-4 !py-2.5" :disabled="operationsState.loading" @click="refresh(true)">
          <UIcon name="i-lucide-refresh-cw" class="size-4" :class="{'animate-spin':operationsState.loading}"/> Refresh live status
        </button>
        <button class="ide-primary" :disabled="operationsState.starting || !!activeBuild" @click="requestBuild">
          <UIcon :name="operationsState.starting ? 'i-lucide-loader-circle':'i-lucide-play'" class="size-4" :class="{'animate-spin':operationsState.starting}"/>
          {{ operationsState.starting ? 'Requesting AWS…' : !isSignedIn ? 'Sign in to build' : canStartBuild ? 'Start AWS Build' : 'Operator access required' }}
        </button>
      </div>
      <p class="muted text-[11px] leading-6 px-5 pb-5">Only invited Cognito users in <code class="mono">origin-operators</code> can trigger a build. The action runs the fixed Origin frontend pipeline, not arbitrary imported repository code. It requires confirmation.</p>

      <div class="border-t border-[#303030] p-5">
        <h3 class="font-semibold mb-4">Recent AWS builds</h3>
        <p v-if="!operationsState.status && operationsState.loading" class="muted text-[12px]">Reading actual AWS job history…</p>
        <p v-else-if="operationsState.status && !operationsState.status.builds.length" class="muted text-[12px]">No builds were returned by CodeBuild.</p>
        <div v-for="build in operationsState.status?.builds || []" :key="build.id" class="border-b border-[#303030] py-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span class="mono text-[11px]">#{{ build.number }} <span class="muted">{{ build.id.slice(0,8) }}</span></span>
            <span class="mono text-[11px]" :class="build.status==='FAILED'?'text-[#ffaaa8]':build.status==='SUCCEEDED'?'text-[#96dba8]':'origin-accent-text'">{{ readableStatus(build.status) }}</span>
          </div>
          <p class="muted text-[11px] mt-1">{{ formatDate(build.startedAt) }} · {{ build.phase || 'Completed' }}</p>
          <p v-if="build.status==='IN_PROGRESS'" role="status" class="mono origin-accent-text text-[10px] mt-2">Running — waiting for actual phase status (percentage not provided by AWS)</p>
          <button v-if="canStartBuild" class="ide-action mt-2" :disabled="logsState.loading" @click="viewLogs(build.id)">
            <UIcon name="i-lucide-scroll-text" class="size-3.5"/>View AWS logs
          </button>
          <div class="flex gap-2 mt-2 flex-wrap">
            <span v-for="phase in build.phases" :key="phase.name" class="origin-tag !text-[9px]">{{ phase.name }} · {{ phase.status || 'Running' }}</span>
          </div>
        </div>
      </div>

      <section v-if="canStartBuild && logsState.buildId" class="border-t border-[#303030] p-5">
        <h3 class="text-[12px] font-semibold mb-2">Private CloudWatch logs · {{logsState.buildId.slice(0,8)}}</h3>
        <p v-if="logsState.error" role="alert" class="ide-notice ide-error mt-2">{{logsState.error}}</p>
        <p v-if="logsState.loading" class="muted text-[11px]">Reading restricted AWS log stream…</p>
        <div v-else-if="logsState.events.length" class="origin-code max-h-[350px] overflow-y-auto mt-4 text-[10px] leading-5" aria-label="AWS build logs">
          <pre v-for="(entry, index) in logsState.events" :key="index" class="whitespace-pre-wrap break-all">{{entry.message}}</pre>
        </div>
        <p v-else class="muted text-[11px] mt-2">No log messages returned yet.</p>
      </section>
      <div class="border-t border-[#303030] p-5">
        <h3 class="text-[12px] font-semibold mb-3">Reproduce frontend build locally</h3>
        <div class="flex flex-wrap items-center gap-2">
          <code class="origin-code flex-1 text-[11px]">{{command}}</code>
          <button class="ide-action !p-2.5" @click="copyCommand"><UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" class="size-4"/>{{ copied ? 'Copied' : 'Copy' }}</button>
        </div>
      </div>
      <div class="p-5 border-t border-[#303030] flex flex-wrap gap-3">
        <a href="https://console.aws.amazon.com/codesuite/codebuild/projects?region=ap-southeast-1" target="_blank" rel="noopener noreferrer" class="ide-action !p-2.5">AWS CodeBuild Console <UIcon name="i-lucide-external-link" class="size-4"/></a>
        <a href="https://d1x9cuojzyjcbw.cloudfront.net/" target="_blank" rel="noopener noreferrer" class="ide-action !p-2.5">Published website <UIcon name="i-lucide-external-link" class="size-4"/></a>
      </div>
    </div>
  </div>
</template>