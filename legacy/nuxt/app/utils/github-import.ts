export type ConnectedRepository = {
  owner: string, name: string, fullName: string, branch: string, url: string,
  commitSha: string, private: boolean, connection: 'github-app'
}
export type ConnectedImport = {
  repository: ConnectedRepository,
  files: { path: string, sha: string, size: number }[]
}
const API = 'https://7a158myew1.execute-api.ap-southeast-1.amazonaws.com'
export function createGitHubImportClient(getAccessToken: () => string, fetcher: typeof fetch = fetch) {
  async function request<T>(path: string, params: Record<string, string>): Promise<T> {
    const token = getAccessToken()
    if (!token) throw new Error('Sign in as an Origin operator to use the GitHub App.')
    const response = await fetcher(`${API}${path}?${new URLSearchParams(params)}`, {
      method: 'GET', credentials: 'omit', cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(30000)
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(data.error || `GitHub import returned HTTP ${response.status}.`)
    return data as T
  }
  return {
    importRepository: (repository: string, ref?: string) => request<ConnectedImport>('/github/import', {
      repository, ...(ref ? { ref } : {})
    }),
    readFile: (repository: string, commit: string, path: string) => request<{ content: string, commitSha: string }>('/github/file', {
      repository, commit, path
    })
  }
}
