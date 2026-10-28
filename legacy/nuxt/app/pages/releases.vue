<script setup lang="ts">
import { computed, ref } from 'vue'

type Entry = { id:string, date:string, category:'Interface'|'Infrastructure'|'Workflow', title:string, details:string[], source?:string }
const entries:Entry[] = [
  {
    id:'live-aws-operations',
    date:'2026-10-24', category:'Infrastructure',
    title:'Live AWS operations API and Cognito-protected build controls',
    details:[
      'Origin reads sanitized live AWS CodeBuild status and phase history via API Gateway and Lambda.',
      'The Build, Dashboard, Overview, Progress and Loading pages use the actual status endpoint.',
      'Starting a fixed frontend build requires Cognito sign-in and operator group membership; there is no public write access.',
      'Amazon Bedrock model inference is unavailable while the connected AWS account is under verification.'
    ],
    source:'https://github.com/examplessdk-lgtm/1origin/blob/feat/origin-live-backend-20261024/infra/aws/origin-operations-api.cloudformation.json'
  },
  {
    id:'integrated-workspace',
    date:'2026-10-24', category:'Interface',
    title:'Integrated Origin workspace — phase one',
    details:[
      'The old template catalog and simulated deployment dashboard are retired from primary navigation.',
      'The IDE, Import Repo, Overview, Projects, Build and Loading routes use one Nuxt application shell.',
      'The source editor can read text files from public GitHub repositories and save edits in the browser.'
    ],
    source:'https://github.com/examplessdk-lgtm/1origin/tree/feat/origin-integrated-workspace'
  },
  {
    id:'aws-static',
    date:'2026-10-24', category:'Infrastructure',
    title:'Origin public frontend on AWS',
    details:[
      'Nuxt static generation is built through AWS CodeBuild with TypeScript validation.',
      'Output is hosted in a private Amazon S3 bucket behind CloudFront with signed origin access.',
      'CloudFront clean-path routing enables direct access to individual application pages.'
    ],
    source:'https://github.com/examplessdk-lgtm/1origin/blob/feat/aws-public-infra/infra/aws/DEPLOYMENT-2026-10-24.md'
  },
  {
    id:'source-composition',
    date:'2026-10-24', category:'Workflow',
    title:'One platform assembled from eight Nuxt UI sources',
    details:[
      'Starter, Dashboard, SaaS, Editor, Chat, Docs, Landing and Changelog are preserved as implementation references.',
      'Modules are activated independently only after their controls have actual working behavior.',
      'Source templates are not presented to end users as separate products.'
    ],
    source:'https://github.com/examplessdk-lgtm/1origin/blob/feat/origin-integrated-workspace/docs/NUXT_SOURCE_COMPOSITION.md'
  }
]
const category = ref('All')
const categories=['All','Interface','Infrastructure','Workflow']
const query = ref('')
const filtered = computed(()=>entries.filter(item=>
  (category.value==='All' || item.category===category.value)
  && (item.title+' '+item.details.join(' ')).toLowerCase().includes(query.value.toLowerCase().trim())
))
const notice = ref('')
async function copyRelease(id:string) {
  const url = window.location.origin+'/releases#'+encodeURIComponent(id)
  try { await navigator.clipboard.writeText(url); notice.value='Release link copied.' }
  catch { notice.value='Copy failed. Select your browser address bar instead.' }
}
</script>

<template>
  <div class="origin-page">
    <div class="eyebrow">ORIGIN / RELEASE NOTES</div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="page-heading">Release Notes<span class="origin-accent-text">.</span></h1>
        <p class="page-subtitle">Changes grounded in code and verified AWS releases, not fabricated product history.</p>
      </div>
      <span class="origin-tag">2026 · Origin</span>
    </div>
    <div class="page-controls mt-8">
      <label class="w-full sm:max-w-xs text-[11px] muted" for="release-filter">
        Search changes
        <input id="release-filter" v-model="query" class="origin-input mt-2" placeholder="Search release notes…" />
      </label>
      <div class="flex flex-wrap gap-2" aria-label="Filter release notes">
        <button v-for="choice in categories" :key="choice" class="ide-action !p-2.5"
          :aria-pressed="category===choice" :class="{'origin-accent-border text-white': category===choice}"
          @click="category=choice">{{choice}}</button>
      </div>
    </div>
    <p v-if="notice" class="muted mt-4" role="status">{{notice}}</p>
    <div class="origin-timeline mt-10 max-w-[1000px]">
      <article v-for="entry in filtered" :id="entry.id" :key="entry.id" class="origin-timeline-item">
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <time class="mono muted text-[11px]" :datetime="entry.date">{{entry.date}}</time>
          <span class="origin-tag">{{entry.category}}</span>
        </div>
        <div class="origin-module-card !p-6">
          <h2 class="text-[16px] font-semibold">{{entry.title}}</h2>
          <ul class="mt-4 space-y-3">
            <li v-for="line in entry.details" :key="line" class="flex gap-2 muted text-[12px] leading-6">
              <UIcon name="i-lucide-chevron-right" class="size-3.5 shrink-0 mt-1 origin-accent-text"/>
              <span>{{line}}</span>
            </li>
          </ul>
          <div class="mt-5 pt-4 border-t border-[#303030] flex flex-wrap gap-3">
            <a v-if="entry.source" :href="entry.source" target="_blank" rel="noopener noreferrer" class="ide-action !p-2.5">
              <UIcon name="i-lucide-git-branch" class="size-4"/>View source evidence
            </a>
            <button class="ide-action !p-2.5" @click="copyRelease(entry.id)">
              <UIcon name="i-lucide-link-2" class="size-4"/>Copy release link
            </button>
          </div>
        </div>
      </article>
      <p v-if="!filtered.length" class="muted text-[12px]">No release notes match these filters.</p>
    </div>
  </div>
</template>