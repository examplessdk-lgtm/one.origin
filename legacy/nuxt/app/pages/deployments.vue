<script setup lang="ts">
onMounted(() => { void navigateTo('/build', { replace: true }) })
</script>
<template>
  <div class="origin-page">
    <h1 class="page-heading">Build history moved.</h1>
    <p class="page-subtitle">The previous deployment records were illustrative and have been removed.</p>
    <NuxtLink to="/build" class="ide-primary mt-6 inline-flex">Open verified AWS build →</NuxtLink>
  </div>
</template>