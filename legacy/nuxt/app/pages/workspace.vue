<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const {
  state, activeFile, activeContent, hydrate, openFile, saveLocal, addLocalFile, downloadActiveFile
} = useOriginWorkspace()

const filter = ref('')
const newFileName = ref('')
const addingFile = ref(false)
const explorerOpen = ref(true)
const detailsOpen = ref(true)
const editorEl = ref<HTMLTextAreaElement | null>(null)
const fileMatches = computed(() => state.value.files.filter(file => file.path.toLowerCase().includes(filter.value.toLowerCase())))
const lines = computed(() => activeContent.value ? activeContent.value.split('\n').length : 0)
const changedOnDisk = computed(() => !!activeFile.value && !!state.value.savedAt[activeFile.value.path])
onMounted(() => { hydrate(); if (window.innerWidth <= 800) explorerOpen.value = false })

function createFile() {
  if (addLocalFile(newFileName.value)) {
    addingFile.value = false
    newFileName.value = ''
  }
}
function editorKeys(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    saveLocal()
  }
  if (event.key !== 'Tab' || !editorEl.value) return
  event.preventDefault()
  const input = editorEl.value
  const start = input.selectionStart
  const end = input.selectionEnd
  const current = activeContent.value
  activeContent.value = current.slice(0, start) + '  ' + current.slice(end)
  requestAnimationFrame(() => { input.selectionStart = start + 2; input.selectionEnd = start + 2 })
}
async function copyContent() {
  try {
    await navigator.clipboard.writeText(activeContent.value)
    state.value.notice = 'Active file copied to clipboard.'
  } catch {
    state.value.error = 'Clipboard permission denied. Select and copy the editor text manually.'
  }
}
</script>

<template>
  <section class="origin-ide" aria-label="Origin integrated development workspace">
    <NuxtLink to="/preview" class="ide-action m-2 inline-flex">สร้างเว็บทดลองจากโค้ด GitHub →</NuxtLink>
    <div class="ide-toolbar">
      <div class="min-w-0 flex items-center gap-2">
        <span class="mono text-[11px] font-semibold text-white">ORIGIN / WORKSPACE</span>
        <span class="muted text-[11px] truncate">{{ state.repository?.fullName || 'No repository open' }}</span>
        <span v-if="state.repository" class="mono text-[10px] muted">· {{ state.repository.branch }}</span>
      </div>
      <div class="ml-auto flex items-center gap-1">
        <button class="ide-tool" :aria-pressed="explorerOpen" title="Toggle file explorer" @click="explorerOpen=!explorerOpen"><UIcon name="i-lucide-panel-left" class="size-4" /></button>
        <NuxtLink to="/import" class="ide-tool ide-tool-label" title="Import a public GitHub repository"><UIcon name="i-lucide-folder-input" class="size-4" /><span>Import</span></NuxtLink>
        <button v-if="state.repository" class="ide-tool" :aria-pressed="detailsOpen" title="Toggle file details" @click="detailsOpen=!detailsOpen"><UIcon name="i-lucide-panel-right" class="size-4" /></button>
      </div>
    </div>

    <div class="ide-layout" :class="{ 'explorer-hidden': !explorerOpen, 'details-hidden': !detailsOpen }">
      <aside v-if="explorerOpen" class="ide-explorer" aria-label="Repository file explorer">
        <div class="ide-pane-title"><span>EXPLORER</span><button v-if="state.repository" class="ide-tool !p-1" aria-label="Create local file" title="Create local file" @click="addingFile=!addingFile"><UIcon name="i-lucide-file-plus-2" class="size-4"/></button></div>
        <div v-if="addingFile" class="p-3 border-b border-[#292929]">
          <form @submit.prevent="createFile" class="space-y-2">
            <label for="new-file-path" class="block muted text-[11px]">New local file path</label>
            <input id="new-file-path" v-model="newFileName" autofocus placeholder="src/new-file.ts" class="ide-input" />
            <div class="flex gap-2">
              <button type="submit" class="ide-action" :disabled="!newFileName.trim()">Create</button>
              <button type="button" class="ide-action" @click="addingFile=false">Cancel</button>
            </div>
          </form>
        </div>
        <div v-if="state.repository" class="border-b border-[#292929] p-2">
          <input v-model="filter" class="ide-input" placeholder="Filter files…" aria-label="Filter imported files" />
        </div>
        <div v-if="state.repository" class="ide-file-list">
          <button v-for="file in fileMatches" :key="file.path" class="ide-file" :class="{active:state.activePath===file.path}" :title="file.path" @click="openFile(file.path)">
            <UIcon :name="file.local ? 'i-lucide-file-plus' : 'i-lucide-file-code-2'" class="size-3.5 shrink-0" />
            <span class="truncate">{{ file.path }}</span>
            <span v-if="file.local" class="mono ml-auto text-[9px] text-[#bbb]">local</span>
          </button>
          <p v-if="!fileMatches.length" class="p-3 muted text-[11px]">No files match this filter.</p>
        </div>
        <div v-else class="px-3 py-8 text-[12px] muted">
          Import a public GitHub repository to browse its real source files.
          <NuxtLink to="/import" class="mt-4 block text-white underline underline-offset-4">Import repository →</NuxtLink>
        </div>
        <div class="ide-pane-bottom">{{ state.files.length }} text files · GitHub read-only</div>
      </aside>

      <section class="ide-editor" aria-label="Source editor">
        <div class="ide-tabs">
          <span v-if="state.activePath" class="ide-tab"><UIcon name="i-lucide-file-code-2" class="size-3.5 shrink-0"/><span class="truncate">{{ state.activePath }}</span></span>
          <span v-else class="mono muted text-[11px]">Editor</span>
          <span class="ml-auto mono muted text-[10px] hidden sm:block">{{ lines }} lines</span>
        </div>

        <div v-if="state.busy" class="ide-state" role="status"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin"/>Reading GitHub…</div>
        <div v-else-if="state.activePath && activeFile" class="ide-editor-content">
          <label for="origin-source-editor" class="sr-only">Code editor for {{ state.activePath }}</label>
          <textarea
            id="origin-source-editor"
            ref="editorEl"
            v-model="activeContent"
            class="ide-code-input"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            :aria-label="'Edit ' + state.activePath"
            @keydown="editorKeys"
          />
        </div>
        <div v-else class="ide-empty">
          <div class="mono text-[29px] font-bold tracking-[-0.09em] text-[#dedede]">ORIGIN /</div>
          <h1 class="text-xl font-semibold">Your development workspace.</h1>
          <p class="max-w-md text-[13px] leading-6 muted text-center">A single interface assembled from Nuxt UI sources. Import a public GitHub repository, open files, edit, save locally and download your work.</p>
          <NuxtLink to="/import" class="ide-primary"><UIcon name="i-lucide-git-branch-plus" class="size-4"/>Import GitHub repository</NuxtLink>
          <span class="mono text-[10px] muted">No GitHub write token or cloud build is triggered.</span>
        </div>

        <div v-if="state.error" class="ide-notice ide-error" role="alert">{{ state.error }}</div>
        <div v-if="state.notice" class="ide-notice" role="status">{{ state.notice }}</div>
        <div class="ide-editor-footer">
          <span class="mono muted text-[10px] truncate">{{ state.activePath ? (activeFile?.local ? 'Local file' : 'Imported public GitHub file') : 'No file selected' }}</span>
          <div class="flex gap-2 ml-auto">
            <button class="ide-action" :disabled="!state.activePath || state.busy" @click="copyContent"><UIcon name="i-lucide-copy" class="size-3.5"/> Copy</button>
            <button class="ide-action" :disabled="!state.activePath || state.busy" @click="downloadActiveFile"><UIcon name="i-lucide-download" class="size-3.5"/> Download</button>
            <button class="ide-primary !py-1.5" :disabled="!state.activePath || state.busy" @click="saveLocal"><UIcon name="i-lucide-save" class="size-3.5"/> Save local</button>
          </div>
        </div>
      </section>

      <aside v-if="detailsOpen && state.repository" class="ide-details" aria-label="Active file and repository details">
        <div class="ide-pane-title">INSPECTOR</div>
        <div class="p-4 space-y-5">
          <div><div class="mono muted text-[10px] uppercase mb-2">Repository</div><a :href="state.repository.url" target="_blank" rel="noopener noreferrer" class="text-[12px] break-words underline underline-offset-4">{{ state.repository.fullName }} ↗</a></div>
          <div><div class="mono muted text-[10px] uppercase mb-2">Source branch</div><span class="mono text-[12px]">{{ state.repository.branch }}</span></div>
          <div><div class="mono muted text-[10px] uppercase mb-2">Active file</div><span class="mono text-[12px] break-all">{{ state.activePath || 'None' }}</span></div>
          <div><div class="mono muted text-[10px] uppercase mb-2">Local save</div><span class="text-[12px]">{{ changedOnDisk && state.activePath ? new Date(state.savedAt[state.activePath]!).toLocaleString() : 'Not saved yet' }}</span></div>
          <div class="border border-[#343434] p-3 text-[11px] leading-5 muted">Your edits stay in this browser. Importing a public repository does not grant GitHub write access. Build, commit and push require a separately authenticated backend.</div>
        </div>
      </aside>
    </div>
  </section>
</template>
