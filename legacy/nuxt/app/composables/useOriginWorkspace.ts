import { computed, watch } from 'vue'
import { createGitHubImportClient } from '../utils/github-import'

export type OriginRepo = {
  owner: string
  name: string
  fullName: string
  branch: string
  url: string
  commitSha?: string
  private?: boolean
  connection?: 'github-app'
}

export type OriginFile = {
  path: string
  sha: string
  size: number
  local?: boolean
}

type WorkspaceState = {
  repository: OriginRepo | null
  files: OriginFile[]
  activePath: string
  contents: Record<string, string>
  savedAt: Record<string, number>
  busy: boolean
  error: string
  notice: string
  hydrated: boolean
}

const STORAGE_KEY = 'origin.integrated-workspace.v1'
const MAX_FILE_BYTES = 262144
const TEXT_FILE = /\.(vue|ts|tsx|js|jsx|mjs|cjs|json|md|mdx|css|scss|html|htm|txt|yaml|yml|toml|xml|svg|py|sh|sql|go|rs|php|rb|env|gitignore|dockerignore|graphql|gql)$/i
const EXACT_FILE = /(^|\/)(Dockerfile|Makefile|LICENSE|README|\.gitignore|\.env\.example)$/

export function useOriginWorkspace() {
  const auth = useOriginAuth()
  const connected = createGitHubImportClient(() => {
    const session = auth.state.value.session
    return session && session.expiresAt > Date.now() + 5000 ? session.accessToken : ''
  })
  const state = useState<WorkspaceState>('origin-integrated-workspace', () => ({
    repository: null,
    files: [],
    activePath: '',
    contents: {},
    savedAt: {},
    busy: false,
    error: '',
    notice: '',
    hydrated: false
  }))

  const activeFile = computed(() => state.value.files.find(file => file.path === state.value.activePath))
  watch(() => auth.state.value.session, (session, previous) => {
    if (state.value.repository?.connection === 'github-app' && (!session || (previous && previous.accessToken !== session.accessToken))) clearWorkspace()
  })
  const activeContent = computed({
    get: () => state.value.contents[state.value.activePath] ?? '',
    set: (text: string) => {
      if (state.value.activePath) {
        state.value.contents[state.value.activePath] = text
      }
    }
  })

  function persist() {
    if (!import.meta.client) return
    try {
      // Connected repositories may be private. Never persist their source in browser storage.
      if (state.value.repository?.connection === 'github-app') {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      const { repository, files, activePath, contents, savedAt } = state.value
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ repository, files, activePath, contents, savedAt }))
    } catch {
      state.value.notice = 'Browser storage is full. Download your edited file to keep a copy.'
    }
  }

  function hydrate() {
    if (!import.meta.client || state.value.hydrated) return
    state.value.hydrated = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const stored = JSON.parse(raw)
      if (!stored || !Array.isArray(stored.files) || typeof stored.contents !== 'object') return
      if (stored.repository?.connection === 'github-app') {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      state.value.repository = stored.repository ?? null
      state.value.files = stored.files.filter((file: OriginFile) => typeof file.path === 'string')
      state.value.activePath = typeof stored.activePath === 'string' ? stored.activePath : ''
      state.value.contents = stored.contents ?? {}
      state.value.savedAt = stored.savedAt ?? {}
    } catch {
      state.value.notice = 'Saved workspace data could not be restored.'
    }
  }

  function parseRepository(input: string): { owner: string, name: string } {
    const trimmed = input.trim().replace(/\/$/, '')
    const match = trimmed.match(/^(?:https:\/\/github\.com\/)?([a-zA-Z0-9-]{1,39})\/([a-zA-Z0-9._-]+?)(?:\.git)?$/)
    if (!match) throw new Error('Enter a public GitHub URL or owner/repository.')
    return { owner: match[1]!, name: match[2]! }
  }

  async function importRepository(input: string, options?: { connection: 'github-app', ref?: string }): Promise<boolean> {
    state.value.error = ''
    state.value.notice = ''
    state.value.busy = true
    try {
      const { owner, name } = parseRepository(input)
      if (options?.connection === 'github-app') {
        const sessionToken = auth.state.value.session?.accessToken
        const result = await connected.importRepository(`${owner}/${name}`, options.ref)
        if (!sessionToken || auth.state.value.session?.accessToken !== sessionToken) throw new Error('Session changed. Import again after signing in.')
        state.value.repository = result.repository
        state.value.files = result.files
        state.value.contents = {}
        state.value.savedAt = {}
        state.value.activePath = ''
        state.value.notice = 'Imported through the GitHub App at commit ' + result.repository.commitSha.slice(0, 12) + '. Edits stay in memory; download files to keep them.'
        persist()
        await openFile(result.files.find(file => /(^|\/)README\.md$/i.test(file.path))?.path || result.files[0]!.path)
        return !state.value.error
      }
      const url = 'https://api.github.com/repos/' + owner + '/' + name
      const metaResponse = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
      if (!metaResponse.ok) throw new Error(metaResponse.status === 404 ? 'Repository not found or private. Public repositories only for now.' : 'GitHub API request failed (' + metaResponse.status + ').')
      const meta = await metaResponse.json()
      const branch = String(meta.default_branch || 'main')
      const treeResponse = await fetch(url + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1', {
        headers: { Accept: 'application/vnd.github+json' }
      })
      if (!treeResponse.ok) throw new Error('GitHub file tree request failed (' + treeResponse.status + ').')
      const tree = await treeResponse.json()
      const matching = (Array.isArray(tree.tree) ? tree.tree : [])
        .filter((file: any) => file.type === 'blob' && typeof file.path === 'string' && typeof file.sha === 'string'
          && (TEXT_FILE.test(file.path) || EXACT_FILE.test(file.path)) && Number(file.size || 0) <= MAX_FILE_BYTES)
        .map((file: any) => ({ path: file.path as string, sha: file.sha as string, size: Number(file.size || 0) }))
      matching.sort((a: OriginFile, b: OriginFile) => a.path.localeCompare(b.path))
      if (!matching.length) throw new Error('No supported text files were found in this repository.')
      // Avoid sending GitHub metadata or source files to an unverified backend.
      state.value.repository = { owner, name, fullName: owner + '/' + name, branch, url: String(meta.html_url || ('https://github.com/' + owner + '/' + name)) }
      state.value.files = matching.slice(0, 1200)
      state.value.contents = {}
      state.value.savedAt = {}
      state.value.activePath = ''
      state.value.notice = (tree.truncated || matching.length > 1200)
        ? 'Repository imported read-only. GitHub returned a partial tree; some files may be omitted.'
        : 'Imported public repository metadata. Editing and saving are local to this browser.'
      persist()
      await openFile(state.value.files.find(file => /(^|\/)README\.md$/i.test(file.path))?.path || state.value.files[0]!.path)
      return true
    } catch (error: any) {
      state.value.error = error instanceof Error ? error.message : 'Could not import repository.'
      return false
    } finally {
      state.value.busy = false
    }
  }

  async function openFile(path: string) {
    const file = state.value.files.find(item => item.path === path)
    if (!file) return
    state.value.activePath = path
    state.value.error = ''
    if (Object.prototype.hasOwnProperty.call(state.value.contents, path)) return
    if (file.local) {
      state.value.contents[path] = ''
      return
    }
    const repo = state.value.repository
    if (!repo) return
    state.value.busy = true
    try {
      if (repo.connection === 'github-app') {
        if (!repo.commitSha) throw new Error('Re-import this repository to pin its commit.')
        const sessionToken = auth.state.value.session?.accessToken
        const result = await connected.readFile(repo.fullName, repo.commitSha, path)
        if (state.value.repository !== repo || !sessionToken || auth.state.value.session?.accessToken !== sessionToken) return
        if (result.commitSha !== repo.commitSha) throw new Error('File commit did not match the workspace.')
        state.value.contents[path] = result.content
        return
      }
      const response = await fetch('https://api.github.com/repos/' + repo.fullName + '/git/blobs/' + file.sha, {
        headers: { Accept: 'application/vnd.github+json' }
      })
      if (!response.ok) throw new Error('Unable to open file (' + response.status + ').')
      const data = await response.json()
      if (data.encoding !== 'base64' || typeof data.content !== 'string') throw new Error('This file cannot be displayed as text.')
      const binary = atob(data.content.replace(/\s/g, ''))
      const bytes = Uint8Array.from(binary.split(''), char => char.charCodeAt(0))
      state.value.contents[path] = new TextDecoder().decode(bytes)
    } catch (error: any) {
      state.value.error = error instanceof Error ? error.message : 'File load failed.'
    } finally {
      state.value.busy = false
    }
  }

  function saveLocal() {
    if (!state.value.activePath) return
    state.value.savedAt[state.value.activePath] = Date.now()
    persist()
    state.value.notice = state.value.repository?.connection === 'github-app'
      ? 'Kept in this tab memory only. Download your file before closing or refreshing. GitHub was not modified.'
      : 'Saved in this browser only. GitHub was not modified.'
  }

  function addLocalFile(input: string): boolean {
    const path = input.trim().replace(/^\/+/, '')
    if (!path || path.split('/').some(part => part === '..' || !part) || !/^[\w./-]+$/.test(path)) {
      state.value.error = 'Enter a valid relative file path (example: src/new-file.ts).'
      return false
    }
    if (state.value.files.some(file => file.path === path)) {
      state.value.error = 'That file already exists. Select it in the Explorer.'
      return false
    }
    state.value.files.unshift({ path, sha: '', size: 0, local: true })
    state.value.activePath = path
    state.value.contents[path] = ''
    state.value.notice = 'Local file created. Use Save Local or Download to keep changes.'
    state.value.error = ''
    persist()
    return true
  }

  function downloadActiveFile() {
    if (!import.meta.client || !state.value.activePath) return
    const filename = state.value.activePath.split('/').pop() || 'file.txt'
    const blob = new Blob([activeContent.value], { type: 'text/plain;charset=utf-8' })
    const uri = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = uri
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(uri)
  }

  function clearWorkspace() {
    state.value.repository = null
    state.value.files = []
    state.value.contents = {}
    state.value.savedAt = {}
    state.value.activePath = ''
    state.value.notice = ''
    state.value.error = ''
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  return { state, activeFile, activeContent, hydrate, importRepository, openFile, saveLocal, addLocalFile, downloadActiveFile, clearWorkspace }
}
