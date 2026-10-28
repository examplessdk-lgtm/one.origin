<script setup lang="ts">
onMounted(() => { void navigateTo('/workspace', { replace: true }) })
</script>
<template>
  <div class="origin-page">
    <div class="eyebrow">ORIGIN / INTEGRATED APPLICATION</div>
    <h1 class="page-heading">Template catalog retired.</h1>
    <p class="page-subtitle">The source templates are integrated into one application feature by feature, rather than being presented as products for users to choose.</p>
    <NuxtLink to="/workspace" class="ide-primary mt-6 inline-flex">Open integrated IDE →</NuxtLink>
  </div>
</template>