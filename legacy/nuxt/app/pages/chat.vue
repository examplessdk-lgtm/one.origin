<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
type Entry = { id:string, body:string, at:number }
const STORAGE = 'origin.workspace-notes.v1'
const notes = ref<Entry[]>([])
const draft = ref('')
const ready = ref(false)
const notice = ref('')
const { state, hydrate } = useOriginWorkspace()
onMounted(()=>{
  hydrate()
  try {
    const raw = localStorage.getItem(STORAGE)
    if(raw) {
      const data = JSON.parse(raw)
      if(Array.isArray(data)) {
        notes.value = data.filter((item: Entry)=> typeof item.id==='string' && typeof item.body==='string' && typeof item.at==='number').slice(-200)
      }
    }
  } catch {
    notice.value='Saved notes could not be restored.'
  }
  ready.value = true
})
watch(notes, () => {
  if(!ready.value) return
  try { localStorage.setItem(STORAGE,JSON.stringify(notes.value)) }
  catch { notice.value='Browser storage is unavailable. Export your notes.' }
},{deep:true})
function submit() {
  const body=draft.value.trim()
  if(!body || body.length>4000) return
  notes.value.push({id:crypto.randomUUID(),body,at:Date.now()})
  if(notes.value.length>200) notes.value.shift()
  draft.value=''
  notice.value='Note saved in this browser. No message was sent to an AI service.'
}
function remove(id:string) {
  notes.value=notes.value.filter(note=>note.id!==id)
  notice.value='Note removed locally.'
}
function exportTranscript() {
  if (!import.meta.client) return
  const text = [
    '# Origin Workspace Notes',
    '',
    'Exported '+new Date().toISOString(),
    'Repository: '+(state.value.repository?.fullName || 'None'),
    '',
    ...notes.value.flatMap(note=>['## '+new Date(note.at).toLocaleString(),'',note.body,''])
  ].join('\n')
  const blob=new Blob([text],{type:'text/markdown;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const anchor=document.createElement('a')
  anchor.href=url
  anchor.download='origin-workspace-notes.md'
  anchor.click()
  URL.revokeObjectURL(url)
  notice.value='Workspace notes exported as Markdown.'
}
function clearNotes() {
  if(!window.confirm('Delete all workspace notes saved in this browser?')) return
  notes.value=[]
  notice.value='Local note thread cleared.'
}
</script>

<template>
  <div class="origin-page max-w-[1150px]">
    <div class="eyebrow">WORKSPACE / CHAT</div>
    <h1 class="page-heading">Chat<span class="origin-accent-text">.</span></h1>
    <p class="page-subtitle">A working local notes thread for project discussion. AI replies are not enabled until the authenticated agent backend is connected.</p>
    <div class="mt-6 flex flex-wrap gap-2 items-center">
      <span class="origin-tag">Local only</span>
      <span class="origin-tag">No AI requests</span>
      <span class="origin-tag">{{ state.repository?.fullName || 'No repository selected' }}</span>
    </div>
    <section class="origin-module-card !p-0 mt-5">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#303030] px-4 py-3">
        <div><h2 class="font-semibold">Workspace conversation notes</h2><p class="muted text-[11px] mt-1">{{notes.length}} saved messages · this browser only</p></div>
        <div class="flex flex-wrap gap-2">
          <button class="ide-action !p-2" @click="exportTranscript"><UIcon name="i-lucide-download" class="size-4"/>Export .md</button>
          <button class="ide-action !p-2" :disabled="!notes.length" @click="clearNotes"><UIcon name="i-lucide-trash-2" class="size-4"/>Clear</button>
        </div>
      </div>
      <div class="origin-chat-list" aria-label="Saved workspace notes" aria-live="polite">
        <div v-if="!notes.length" class="m-auto max-w-md text-center flex flex-col items-center gap-3 py-12">
          <UIcon name="i-lucide-message-square-plus" class="size-8 origin-accent-text"/>
          <h2 class="text-[15px] font-semibold">Start a project note</h2>
          <p class="muted text-[12px] leading-6">Write a task, idea or implementation question for your own reference. Notes are saved locally. No automated AI replies are generated.</p>
        </div>
        <article v-for="note in notes" :key="note.id" class="origin-chat-message ml-auto">
          <div class="flex flex-wrap justify-between items-center gap-4">
            <span class="mono text-[10px] origin-accent-text">YOUR NOTE</span>
            <time class="mono muted text-[10px]">{{new Date(note.at).toLocaleString()}}</time>
          </div>
          <p class="text-[12px] leading-6 mt-3">{{ note.body }}</p>
          <div class="flex justify-end mt-3">
            <button class="muted text-[11px] hover:text-white underline underline-offset-4" :aria-label="'Delete note from '+new Date(note.at).toLocaleString()" @click="remove(note.id)">Delete note</button>
          </div>
        </article>
      </div>
      <form class="origin-chat-composer" @submit.prevent="submit">
        <label for="chat-draft" class="text-[11px] muted">New note · max 4,000 characters</label>
        <textarea id="chat-draft" v-model="draft" rows="3" maxlength="4000" placeholder="Write a project note…" class="origin-input resize-y" />
        <div class="flex flex-wrap justify-between gap-3 items-center">
          <span class="mono muted text-[10px]">{{draft.length}} / 4000 · stored in this browser</span>
          <button type="submit" :disabled="!draft.trim()" class="ide-primary">
            <UIcon name="i-lucide-plus" class="size-4"/>Save note
          </button>
        </div>
      </form>
    </section>
    <p v-if="notice" role="status" class="source-note mt-4">{{notice}}</p>
    <div class="source-note mt-5">
      The official Nuxt UI Chat source remains available in the project repository for the future agent interface. Authenticated Bedrock responses, streaming, uploads and session sync are separate backend activation steps; this local thread does not impersonate those features.
      <NuxtLink to="/docs" class="origin-accent-text underline underline-offset-4 ml-2">Read the security scope</NuxtLink>
    </div>
  </div>
</template>
