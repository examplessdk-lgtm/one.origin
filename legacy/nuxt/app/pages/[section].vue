<script setup lang="ts">
onMounted(() => { void navigateTo('/overview', { replace: true }) })
</script>
<template>
  <div class="origin-page">
    <h1 class="page-heading">This preview section has been retired.</h1>
    <p class="page-subtitle">Functionality is being added to the unified Origin workspace one verified feature at a time.</p>
    <NuxtLink to="/overview" class="ide-primary inline-flex mt-5">Open overview →</NuxtLink>
  </div>
</template>