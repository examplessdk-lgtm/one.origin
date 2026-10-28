/**
 * UI-only fixture records. Not a query of AWS, Neon, GitHub, or a live deployment.
 * Never show these as real deployments or user data.
 */
export type State = 'ready' | 'building' | 'queued' | 'failed'
export type Project = { id: string; name: string; repo: string; framework: string; updated: string; state: State }
export type Deployment = { id: string; project: string; branch: string; commit: string; age: string; duration: string; state: State }
export const projects: Project[] = [
  { id: 'p1', name: 'web-frontend', repo: 'example/web-frontend', framework: 'Next.js', updated: '3m ago', state: 'ready' },
  { id: 'p2', name: 'api-service', repo: 'example/api-service', framework: 'Node.js', updated: '18m ago', state: 'building' },
  { id: 'p3', name: 'docs-site', repo: 'example/docs-site', framework: 'Nuxt', updated: '2h ago', state: 'ready' },
  { id: 'p4', name: 'worker-sandbox', repo: 'example/worker-sandbox', framework: 'Worker', updated: '1d ago', state: 'failed' }
]
export const deployments: Deployment[] = [
  { id: 'dpl_8fj2', project: 'web-frontend', branch: 'main', commit: 'a184c5e', age: '3m ago', duration: '42s', state: 'ready' },
  { id: 'dpl_7kd9', project: 'api-service', branch: 'feat/auth', commit: 'b248a1d', age: '18m ago', duration: '—', state: 'building' },
  { id: 'dpl_6pt4', project: 'docs-site', branch: 'main', commit: 'd71f6b0', age: '2h ago', duration: '31s', state: 'ready' },
  { id: 'dpl_5ry1', project: 'worker-sandbox', branch: 'main', commit: '9a3c724', age: '1d ago', duration: '1m 15s', state: 'failed' },
  { id: 'dpl_4nv8', project: 'web-frontend', branch: 'main', commit: '8d29b16', age: '2d ago', duration: '48s', state: 'ready' }
]
export const statusLabels: Record<State, string> = { ready: 'Ready', building: 'Building', queued: 'Queued', failed: 'Failed' }
