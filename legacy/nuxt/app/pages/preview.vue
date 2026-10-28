<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,watch} from 'vue'
import {createPreviewClient,type PreviewBuild} from '~/utils/preview'
const auth=useOriginAuth()
const branch=ref('main')
const builds=ref<PreviewBuild[]>([])
const loading=ref(false), starting=ref(false), error=ref(''), notice=ref('')
const logId=ref(''), logs=ref(''), logsLoading=ref(false)
let polling:ReturnType<typeof setInterval>|null=null
const client=createPreviewClient(()=>{
  const session=auth.state.value.session
  return session && session.expiresAt>Date.now()+5000 ? session.accessToken : ''
})
const active=computed(()=>builds.value.some(b=>['IN_PROGRESS','QUEUED'].includes(b.status)))
async function refresh() {
  if (!auth.isSignedIn.value || loading.value) return
  loading.value=true
  try { builds.value=(await client.history()).builds; error.value='' }
  catch(e) { error.value=e instanceof Error?e.message:'Cannot read preview history.' }
  finally { loading.value=false }
}
async function start() {
  if (!auth.isSignedIn.value) { await auth.signIn('/preview'); return }
  if (!auth.canStartBuild.value || starting.value || active.value) return
  if (!window.confirm('สร้างเว็บทดลองจาก GitHub บน AWS? มีค่า Build ตามการใช้งาน และลิงก์เปิดได้สาธารณะ 7 วัน')) return
  starting.value=true; error.value=''; notice.value=''
  try {
    const result=await client.start(crypto.randomUUID(),branch.value.trim() || 'main')
    builds.value=[result.build,...builds.value.filter(b=>b.id!==result.build.id)]
    notice.value='AWS รับงานแล้ว รอสถานะ SUCCEEDED เพื่อเปิดลิงก์ Preview'
    await refresh()
  } catch(e) {
    error.value=(e instanceof Error?e.message:'Cannot start preview.')+' กรุณากดตรวจสถานะก่อนสร้างงานใหม่ เพราะ AWS อาจรับงานไปแล้ว'
  } finally {starting.value=false}
}
async function viewLogs(id:string) {
  if(logsLoading.value)return
  logId.value=id; logsLoading.value=true; logs.value=''
  try {logs.value=(await client.logs(id)).events.map(e=>e.message).join('') || 'ยังไม่มีข้อความจาก Build'}
  catch(e) {error.value=e instanceof Error?e.message:'Cannot read logs.'}
  finally {logsLoading.value=false}
}
watch(()=>auth.state.value.session,()=>{builds.value=[];logs.value='';logId.value='';if(auth.isSignedIn.value)void refresh()})
onMounted(()=>{auth.hydrate();void refresh();polling=setInterval(()=>{void refresh()},10000)})
onBeforeUnmount(()=>{if(polling)clearInterval(polling)})
</script>
<template>
  <div class="origin-page">
    <div class="eyebrow">GITHUB → BUILD → PREVIEW</div>
    <h1 class="page-heading">สร้างเว็บทดลอง<span class="origin-accent-text">.</span></h1>
    <p class="page-subtitle">สร้างหน้าเว็บจากโค้ดบน GitHub แล้วรับลิงก์เปิดดูผลลัพธ์จริง</p>
    <section class="origin-module-card mt-6 max-w-[1000px]">
      <h2 class="font-semibold">1. เลือกโค้ดที่จะสร้าง</h2>
      <p class="mono text-[12px] mt-3 break-all">examplessdk-lgtm/1origin · ui/nuxt</p>
      <p class="muted text-[12px] mt-2">รุ่นแรกสร้างเฉพาะโปรเจกต์นี้เป็นเว็บ Static การแก้ไฟล์ที่บันทึกในเบราว์เซอร์ยังไม่รวมใน Build</p>
      <label class="block mt-4 text-[12px]" for="preview-branch">Branch (ใช้ main ได้เลย)</label>
      <input id="preview-branch" v-model="branch" class="w-full mt-2 p-3 bg-black border border-[#303030] rounded" maxlength="128" :disabled="starting" />
      <div class="mt-4 flex flex-wrap gap-3">
        <button class="ide-primary" :disabled="starting||active||(auth.isSignedIn.value&&!auth.canStartBuild.value)" @click="start">
          {{starting?'กำลังส่งงาน…':!auth.isSignedIn.value?'เข้าสู่ระบบเพื่อสร้างเว็บ':active?'กำลัง Build…':'2. สร้างเว็บทดลอง'}}
        </button>
        <button class="ide-action" :disabled="loading||!auth.isSignedIn.value" @click="refresh">ตรวจสถานะ</button>
      </div>
      <p v-if="auth.isSignedIn.value&&!auth.canStartBuild.value" class="muted mt-3">บัญชีนี้ยังไม่มีสิทธิ์ผู้ดูแล</p>
      <p class="muted text-[11px] mt-4">Preview เปิดสาธารณะและเก็บไฟล์ 7 วัน โดยแยกจากเว็บหลัก มีค่า AWS ตามการใช้งาน</p>
    </section>
    <p v-if="error" class="ide-notice ide-error mt-4" role="alert">{{error}}</p>
    <p v-if="notice" class="ide-notice mt-4" role="status">{{notice}}</p>
    <section class="origin-module-card mt-6 max-w-[1000px]">
      <h2 class="font-semibold">3. เปิดเว็บและดูผลการสร้าง</h2>
      <p v-if="!builds.length" class="muted text-[12px] mt-4">{{loading?'กำลังอ่านสถานะจาก AWS…':!auth.isSignedIn.value?'เข้าสู่ระบบเพื่อดูงานของคุณ':'ยังไม่มีงาน Preview ในประวัติล่าสุด'}}</p>
      <article v-for="build in builds" :key="build.id" class="py-4 border-b border-[#303030]">
        <p class="mono text-[12px] break-all">{{build.status}} · {{build.branch}} · {{build.commit?.slice(0,8)}}</p>
        <p class="muted text-[11px] mt-1">{{build.createdAt?new Date(build.createdAt).toLocaleString():'เพิ่งส่งงาน'}}</p>
        <div class="flex flex-wrap gap-3 mt-3">
          <a v-if="build.url" :href="build.url" class="ide-primary" target="_blank" rel="noopener noreferrer">เปิดเว็บ Preview ↗</a>
          <button class="ide-action" :disabled="logsLoading" @click="viewLogs(build.id)">ดู Logs</button>
        </div>
        <p v-if="build.status==='FAILED'" class="text-[12px] mt-2">สร้างไม่ผ่าน กดดู Logs เพื่ออ่านสาเหตุ</p>
        <div class="flex gap-2 mt-3 flex-wrap"><span v-for="phase in build.phases" :key="phase.name" class="origin-tag !text-[9px]">{{phase.name}} · {{phase.status}}</span></div>
      </article>
      <section v-if="logId" class="mt-5">
        <h3 class="text-[12px] font-semibold">Logs · {{logId.slice(0,8)}} (ล่าสุดไม่เกิน 200 ข้อความ)</h3>
        <button class="ide-action mt-2" :disabled="logsLoading" @click="viewLogs(logId)">อ่าน Logs อีกครั้ง</button>
        <pre class="origin-code mt-3 max-h-[450px] overflow-auto whitespace-pre-wrap break-all text-[11px]">{{logsLoading?'กำลังอ่าน…':logs}}</pre>
      </section>
    </section>
  </div>
</template>
