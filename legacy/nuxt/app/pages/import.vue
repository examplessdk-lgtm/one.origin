<script setup lang="ts">
import { onMounted, ref } from 'vue'
const { state, hydrate, importRepository } = useOriginWorkspace()
const input = ref('')
const branch = ref('')
const useApp = ref(useRoute().query.connection === 'github-app')
const auth = useOriginAuth()
const router = useRouter()
onMounted(() => { auth.hydrate(); hydrate() })
async function submit() {
  if (!input.value.trim() || state.value.busy) return
  if (useApp.value && !auth.isSignedIn.value) { await auth.signIn('/import?connection=github-app'); return }
  if (await importRepository(input.value, useApp.value ? { connection: 'github-app', ref: branch.value.trim() || undefined } : undefined)) await router.push('/workspace')
}
</script>
<template>
  <div class="origin-page max-w-[1000px]">
    <div class="eyebrow">WORKSPACE / SOURCE CONTROL</div>
    <h1 class="page-heading">Import repository<span class="text-white">.</span></h1>
    <p class="page-subtitle">Read public source directly, or use your connected GitHub App to import an authorized repository at a pinned commit.</p>

    <div class="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_270px]">
      <section class="border border-[#343434] bg-[#111] p-5 sm:p-7">
        <div class="flex items-center gap-3 mb-6"><UIcon name="i-simple-icons-github" class="size-6"/><div><h2 class="font-semibold text-[14px]">GitHub repository</h2><p class="text-[11px] muted mt-1">Read-only source import</p></div></div>
        <form @submit.prevent="submit">
          <label class="flex items-center gap-2 text-[12px] mb-4"><input v-model="useApp" type="checkbox" />Use connected GitHub App</label>
          <label for="origin-repo-url" class="block text-[12px] mb-2">Repository URL or owner/repo</label>
          <input id="origin-repo-url" v-model="input" required autocomplete="url" spellcheck="false"
            placeholder="https://github.com/owner/repository" class="ide-input !py-3 !px-3" />
          <template v-if="useApp">
            <label for="origin-repo-branch" class="block text-[12px] mt-4 mb-2">Branch or commit (optional)</label>
            <input id="origin-repo-branch" v-model="branch" maxlength="128" placeholder="Default branch" class="ide-input !py-3 !px-3" />
            <p class="muted text-[11px] leading-5 mt-2">Operator sign-in required. Only repositories enabled for this workspace can be read. Connected source stays in tab memory; download edits before refreshing.</p>
            <p v-if="auth.isSignedIn.value && !auth.canStartBuild.value" role="status" class="ide-notice">This account needs Origin operator access to import with the GitHub App.</p>
          </template>
          <p v-else class="muted text-[11px] leading-5 mt-2">Public repositories only. Import and edits are saved in this browser. No GitHub credentials are required.</p>
          <p v-if="state.error" role="alert" class="mt-4 ide-notice ide-error">{{ state.error }}</p>
          <div class="flex flex-wrap gap-3 mt-7">
            <button type="submit" :disabled="state.busy || !input.trim() || (useApp && auth.isSignedIn.value && !auth.canStartBuild.value)" class="ide-primary">
              <UIcon :name="state.busy ? 'i-lucide-loader-circle' : 'i-lucide-folder-input'" class="size-4" :class="{'animate-spin':state.busy}"/>
              {{ state.busy ? 'Reading GitHub…' : useApp && !auth.isSignedIn.value ? 'Sign in to import' : 'Import into workspace' }}
            </button>
            <NuxtLink to="/workspace" class="ide-action !px-4 !py-2.5">Back to IDE</NuxtLink>
          </div>
        </form>
      </section>
      <aside class="space-y-4">
        <div class="border border-[#343434] p-5">
          <h2 class="mono uppercase text-[11px] mb-3">What actually happens</h2>
          <ol class="space-y-4 text-[12px] text-[#bdbdbd]">
            <li>01 · Verify public access or workspace GitHub App permission</li>
            <li>02 · Read the source tree; connected imports pin a commit</li>
            <li>03 · Open the source file in the integrated editor</li>
            <li>04 · Save edits locally or download files</li>
          </ol>
        </div>
        <div class="source-note">
          <strong class="text-white">Not enabled here:</strong> committing, pushing, executing scripts and building imported repositories. The Build page still runs the fixed Origin frontend pipeline.
        </div>
      </aside>
    </div>
    <section v-if="state.repository" class="mt-10">
      <h2 class="section-title mb-3">Current browser workspace</h2>
      <NuxtLink to="/workspace" class="quick-item"><span>{{ state.repository.fullName }} <span class="muted mono text-[11px]">· {{ state.repository.branch }}</span></span><UIcon name="i-lucide-arrow-up-right" class="size-4"/></NuxtLink>
    </section>
  </div>
</template>
