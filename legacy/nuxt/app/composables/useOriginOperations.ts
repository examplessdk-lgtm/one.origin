import { computed } from 'vue'

export type OriginBuild = {
  id: string
  status: string
  phase?: string | null
  number?: number | null
  startedAt?: string | null
  endedAt?: string | null
  phases: { name: string, status?: string }[]
}

export type OriginStatus = {
  service: string
  source: string
  project: string
  fetchedAt: string
  builds: OriginBuild[]
  startRequiresOperator: boolean
}

const API_BASE = 'https://7a158myew1.execute-api.ap-southeast-1.amazonaws.com'

type OperationsState = {
  status: OriginStatus | null
  loading: boolean
  starting: boolean
  error: string
  notice: string
  lastRefreshedAt: number
}

export function useOriginOperations() {
  const state = useState<OperationsState>('origin-live-operations', () => ({
    status: null,
    loading: false,
    starting: false,
    error: '',
    notice: '',
    lastRefreshedAt: 0
  }))

  const logsState = useState<{ buildId: string, loading: boolean, events: { timestamp: number, message: string }[], error: string }>('origin-operator-build-logs', () => ({
    buildId:'', loading:false, events:[], error:''
  }))
  const latestBuild = computed(() => state.value.status?.builds?.[0] ?? null)
  const activeBuild = computed(() => state.value.status?.builds.find(build => build.status === 'IN_PROGRESS') ?? null)
  const buildCount = computed(() => state.value.status?.builds.length ?? 0)

  async function refresh(force = false): Promise<boolean> {
    if (!import.meta.client) return false
    if (state.value.loading) return false
    if (!force && state.value.status && Date.now() - state.value.lastRefreshedAt < 5000) return true
    state.value.loading = true
    try {
      const response = await fetch(API_BASE + '/status', {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      })
      if (!response.ok) throw new Error('AWS status endpoint returned HTTP ' + response.status + '.')
      const data = await response.json() as OriginStatus
      if (data.source !== 'aws-codebuild' || !Array.isArray(data.builds)) throw new Error('Unexpected response from AWS operations API.')
      state.value.status = data
      state.value.lastRefreshedAt = Date.now()
      state.value.error = ''
      return true
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : 'Unable to read live build status.'
      return false
    } finally {
      state.value.loading = false
    }
  }

  async function startBuild(accessToken: string): Promise<boolean> {
    if (!import.meta.client || !accessToken || state.value.starting) return false
    state.value.error = ''
    state.value.notice = ''
    state.value.starting = true
    try {
      const response = await fetch(API_BASE + '/build', {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken
        },
        body: '{}'
      })
      const data = await response.json().catch(() => ({})) as { error?: string, build?: OriginBuild }
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error(data.error || 'Sign in as an Origin operator to trigger builds.')
        throw new Error(data.error || ('AWS could not start the build (HTTP ' + response.status + ').'))
      }
      state.value.notice = 'AWS accepted the build request. Refreshing the live job status.'
      await refresh(true)
      return true
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : 'Unable to start build.'
      return false
    } finally {
      state.value.starting = false
    }
  }

  async function loadLogs(accessToken: string, buildId: string): Promise<boolean> {
    if (!import.meta.client || !accessToken || !/^[a-f0-9-]{36}$/.test(buildId)) return false
    logsState.value.buildId = buildId
    logsState.value.events = []
    logsState.value.error = ''
    logsState.value.loading = true
    try {
      const response = await fetch(API_BASE + '/logs?id=' + encodeURIComponent(buildId), {
        headers:{ Authorization:'Bearer ' + accessToken, Accept:'application/json' },
        credentials:'omit', cache:'no-store'
      })
      const result = await response.json().catch(() => ({})) as { error?:string, events?:{timestamp:number,message:string}[] }
      if (!response.ok) throw new Error(result.error || 'AWS rejected logs request (HTTP ' + response.status + ').')
      logsState.value.events = Array.isArray(result.events) ? result.events : []
      return true
    } catch (error) {
      logsState.value.error = error instanceof Error ? error.message : 'Unable to load build logs.'
      return false
    } finally {
      logsState.value.loading = false
    }
  }

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—'
    const value = new Date(iso)
    return Number.isFinite(value.getTime()) ? value.toLocaleString() : '—'
  }

  return { state, logsState, latestBuild, activeBuild, buildCount, refresh, startBuild, loadLogs, formatDate }
}
