<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
const route = useRoute()
const router = useRouter()
const { state, hydrate } = useOriginWorkspace()
const auth = useOriginAuth()
const { state: authState, isSignedIn } = auth
async function openLogin() { await auth.signIn(route.path) }
const sidebar = ref(false)
const palette = ref(false)
const search = ref('')
const pages = [
  { label: 'Workspace', to: '/workspace', icon: 'i-lucide-panels-top-left', group: 'Workspace' },
  { label: 'Overview', to: '/overview', icon: 'i-lucide-layout-dashboard', group: 'Workspace' },
  { label: 'Dashboard', to: '/dashboard', icon: 'i-lucide-blocks', group: 'Workspace' },
  { label: 'Import Repo', to: '/import', icon: 'i-lucide-folder-input', group: 'Workspace' },
  { label: 'Projects', to: '/projects', icon: 'i-lucide-folder-git-2', group: 'Workspace' },
  { label: 'Chat Notes', to: '/chat', icon: 'i-lucide-message-square-text', group: 'Workspace' },
  { label: 'Build', to: '/build', icon: 'i-lucide-hammer', group: 'Operations' },
  { label: 'Progress', to: '/progress', icon: 'i-lucide-list-checks', group: 'Operations' },
  { label: 'Loading', to: '/loading', icon: 'i-lucide-activity', group: 'Operations' },
  { label: 'Docs', to: '/docs', icon: 'i-lucide-book-open', group: 'Knowledge' },
  { label: 'Release Notes', to: '/releases', icon: 'i-lucide-git-commit-horizontal', group: 'Knowledge' }
]
const selected = computed(() => pages.find(item => item.to === route.path) || pages[0]!)
const matches = computed(() => pages.filter(item => item.label.toLowerCase().includes(search.value.trim().toLowerCase())))
function navigate(to: string) {
  palette.value = false
  sidebar.value = false
  search.value = ''
  void router.push(to)
}
function keydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    palette.value = !palette.value
  }
  if (event.key === 'Escape') { palette.value = false; sidebar.value = false }
}
onMounted(() => { hydrate(); auth.hydrate(); window.addEventListener('keydown', keydown) })
onBeforeUnmount(() => window.removeEventListener('keydown', keydown))
watch(() => route.path, () => { sidebar.value = false })
</script>

<template>
  <div class="origin-shell">
    <a href="#origin-content" class="sr-only focus:not-sr-only">Skip to content</a>
    <nav class="activity-rail" aria-label="Quick sections">
      <NuxtLink to="/workspace" class="rail-link" aria-label="Origin Workspace">
        <span class="mono text-[15px] font-bold tracking-[-2px] text-white">O/</span>
      </NuxtLink>
      <div class="mt-4 flex flex-col">
        <NuxtLink v-for="page in pages.slice(0,7)" :key="page.to" :to="page.to" :title="page.label"
          :aria-label="page.label" class="rail-link" :class="{ active: route.path === page.to }">
          <UIcon :name="page.icon" class="size-[17px]" />
        </NuxtLink>
      </div>
      <div class="mt-auto mb-3 flex flex-col">
        <NuxtLink to="/overview" class="rail-link" title="Overview" aria-label="Overview">
          <UIcon name="i-lucide-info" class="size-[17px]" />
        </NuxtLink>
      </div>
    </nav>

    <button class="mobile-scrim" :class="{ 'is-open': sidebar }" aria-label="Close navigation" @click="sidebar = false" />
    <aside class="origin-sidebar" :class="{ 'is-open': sidebar }" aria-label="Workspace navigation">
      <div class="sidebar-header">
        <NuxtLink to="/workspace" class="mono font-semibold">ORIGIN <span class="text-[#7d7d7d]">/ WORKSPACE</span></NuxtLink>
        <UIcon name="i-lucide-chevrons-up-down" class="size-3 text-[#777]" />
      </div>
      <div class="p-3">
        <UButton block icon="i-lucide-search" size="sm" color="neutral" variant="outline"
          class="rounded-none! justify-start! border-[#333]!" @click="palette = true">
          <span class="flex w-full justify-between items-center"><span>Go to page</span><span class="mono muted text-[10px]">⌘K</span></span>
        </UButton>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <template v-for="group in ['Workspace', 'Operations', 'Knowledge']" :key="group">
          <div class="sidebar-group">{{ group }}</div>
          <nav :aria-label="group">
            <NuxtLink v-for="page in pages.filter(item => item.group === group)" :key="page.to"
              :to="page.to" class="sidebar-navlink">
              <UIcon :name="page.icon" class="size-4 shrink-0" />
              <span>{{ page.label }}</span>
            </NuxtLink>
          </nav>
        </template>
      </div>
      <div class="border-t border-[#2b2b2b] p-3 flex items-center gap-3">
        <span class="mono flex size-7 items-center justify-center border border-[#444] text-[10px]">OR</span>
        <span class="min-w-0">
          <span class="text-[12px]">Integrated workspace</span>
          <span class="block truncate muted mono text-[10px]">{{ state.repository?.fullName || 'No repository imported' }}</span>
        </span>
      </div>
    </aside>

    <main id="origin-content" class="origin-main">
      <header class="main-topbar">
        <button aria-label="Toggle navigation" class="inline-flex size-7 items-center justify-center lg:hidden"
          @click="sidebar = !sidebar"><UIcon name="i-lucide-panel-left" class="size-5" /></button>
        <div class="mono text-[11px] flex items-center gap-2"><span class="muted">origin</span><span class="muted">/</span><span>{{ selected.label.toLowerCase() }}</span></div>
        <div class="ml-auto flex items-center gap-3">
          <span class="hidden sm:inline-flex items-center gap-2 muted text-[11px]">
            <span class="inline-block size-1.5 bg-[#8fbc8f]" />
            {{ state.busy ? 'Import running' : 'Static AWS frontend' }}
          </span>
          <NuxtLink to="/import" class="mono text-[11px] border border-[#404040] px-2 py-1 hover:bg-[#232323]">Import repo</NuxtLink>
          <button v-if="!isSignedIn" class="mono text-[11px] border border-[#404040] px-2 py-1 hover:bg-[#232323]"
            title="Sign in with Cognito to access protected operations" @click="openLogin">
            <UIcon name="i-lucide-log-in" class="size-3.5 inline"/> <span class="hidden sm:inline">Sign in</span>
          </button>
          <button v-else class="mono text-[11px] border border-[#404040] px-2 py-1 hover:bg-[#232323]"
            :title="authState.session?.email || 'Sign out of Origin'" @click="auth.signOut">
            <UIcon name="i-lucide-log-out" class="size-3.5 inline"/> <span class="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
      <div class="page-content"><slot /></div>
    </main>

    <footer class="origin-statusbar">
      <span class="flex items-center gap-2"><UIcon name="i-lucide-git-branch" class="size-3" />{{ state.repository?.fullName || 'origin / no repo' }}</span>
      <span class="flex items-center gap-3"><span class="hide-phone">Public GitHub read-only · Local editor</span><span class="text-white">Nuxt UI</span></span>
    </footer>

    <div v-if="palette" class="overlay" role="presentation" @click.self="palette = false">
      <div class="palette" role="dialog" aria-modal="true" aria-label="Go to page">
        <div class="flex items-center gap-3 p-4">
          <UIcon name="i-lucide-search" class="size-5 muted" />
          <input v-model="search" autofocus aria-label="Find a page"
            class="w-full bg-transparent outline-none text-[14px]" placeholder="Search pages…"
            @keydown.enter="matches[0] && navigate(matches[0].to)" />
          <button class="mono muted text-[11px] border border-[#444] px-1.5" @click="palette = false">ESC</button>
        </div>
        <div class="max-h-80 overflow-y-auto">
          <button v-for="page in matches" :key="page.to" class="palette-item" @click="navigate(page.to)">
            <UIcon :name="page.icon" class="size-4 muted" /><span>{{ page.label }}</span>
            <span class="ml-auto mono text-[11px] muted">{{ page.to }}</span>
          </button>
          <p v-if="!matches.length" class="p-4 muted">No matching pages</p>
        </div>
      </div>
    </div>
  </div>
</template>