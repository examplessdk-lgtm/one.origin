<script setup lang="ts">
onMounted(() => { void navigateTo('/workspace', { replace: true }) })
</script>
<template>
  <div class="origin-page">
    <div class="eyebrow">ORIGIN / WORKSPACE</div>
    <h1 class="page-heading">Opening IDE…</h1>
    <p class="page-subtitle">The preview dashboard is no longer the entry page.</p>
    <NuxtLink to="/workspace" class="ide-primary mt-6 inline-flex">Open IDE workspace →</NuxtLink>
  </div>
</template>