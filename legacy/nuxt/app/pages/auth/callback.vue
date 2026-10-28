<script setup lang="ts">
import { ref } from 'vue'

const { state, completeSignIn, signIn } = useOriginAuth()
const message = ref('Verifying Cognito sign-in…')
const success = ref(false)

onNuxtReady(async () => {
  // Prerender hydration temporarily replaces even window.location with the static path.
  // Wait for Nuxt to restore the returned URL before parsing OAuth parameters.
  // OAuth callback parameters must come from the actual returned URL; never log them.
  const query = new URLSearchParams(window.location.search)
  const code = query.get('code') || ''
  const returnedState = query.get('state') || ''
  const providerError = query.get('error_description') || query.get('error') || ''
  if (providerError) { message.value = providerError; return }
  if (!code || !returnedState) {
    message.value = 'No valid authorization code was returned. Restart sign-in.'
    return
  }
  try {
    const destination = await completeSignIn(code, returnedState)
    success.value = true
    message.value = 'Sign-in complete. Opening Origin…'
    await navigateTo(destination, { replace:true })
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Unable to complete sign-in.'
  }
})
</script>

<template>
  <div class="origin-page max-w-[760px]">
    <div class="eyebrow">ORIGIN / IDENTITY</div>
    <h1 class="page-heading">Connect account<span class="origin-accent-text">.</span></h1>
    <section class="origin-module-card mt-8">
      <div class="flex items-center gap-3">
        <UIcon :name="state.busy ? 'i-lucide-loader-circle' : success ? 'i-lucide-check-circle-2' : 'i-lucide-lock-keyhole'"
          class="size-6 origin-accent-text" :class="{'animate-spin':state.busy}"/>
        <div><h2 class="font-semibold">Amazon Cognito</h2><p role="status" class="muted text-[12px] leading-6 mt-1">{{ message }}</p></div>
      </div>
      <div v-if="!state.busy && !success" class="mt-6 flex flex-wrap gap-2">
        <button class="ide-primary" @click="signIn('/build')">Try sign-in again</button>
        <NuxtLink to="/dashboard" class="ide-action !p-2.5">Back to dashboard</NuxtLink>
      </div>
    </section>
  </div>
</template>