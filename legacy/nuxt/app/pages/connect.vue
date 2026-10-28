<script setup lang="ts">
const services = [
  { name: 'Amazon Cognito', detail: 'User Pool and public OAuth client created in Singapore', status: 'Provisioned' },
  { name: 'Neon Function', detail: 'originfiles / configured: true at last check', status: 'Provisioned' },
  { name: 'Neon Object Storage', detail: 'Private bucket origin-files created', status: 'Provisioned' },
  { name: 'Production hosting', detail: '1origin.dev cutover not completed', status: 'Pending' },
  { name: 'Browser login + upload E2E', detail: 'Real user journey still untested', status: 'Pending' }
]
</script>
<template><div class="origin-page">
  <div class="eyebrow">INFRASTRUCTURE / CONNECT</div>
  <h1 class="page-heading">Connections<span class="text-[#4c9aff]">.</span></h1>
  <p class="page-subtitle">Cloud services that are available for later integration. These are setup notes, not live health checks.</p>
  <div class="mt-8 border-t border-[#2a2a2a]">
    <div v-for="s in services" :key="s.name" class="flex flex-wrap items-center justify-between gap-4 border-b border-[#2a2a2a] py-5">
      <div><h2 class="font-medium">{{ s.name }}</h2><p class="muted mt-1 text-[12px]">{{ s.detail }}</p></div>
      <span class="mono text-[11px]" :class="s.status==='Provisioned' ? 'status-ready' : 'status-building'">{{ s.status }}</span>
    </div>
  </div>
  <div class="source-note mt-8">This UI has no credentials or backend write access. Integration will follow UI review and a separate hosting cutover.</div>
</div></template>
